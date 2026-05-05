import base64
import hashlib
import os
import secrets
import time
from urllib.parse import urlencode

import requests
from flask import session


SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SCOPES = "playlist-modify-public playlist-modify-private user-read-private"


class SpotifyError(RuntimeError):
    def __init__(self, message, status_code=502, payload=None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload or {"error": message}


def _client_id():
    return os.environ.get("SPOTIFY_CLIENT_ID", "")


def _client_secret():
    return os.environ.get("SPOTIFY_CLIENT_SECRET", "")


def _redirect_uri():
    return os.environ.get("SPOTIFY_REDIRECT_URI", "http://localhost:5000/api/auth/callback")


def _base64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def make_pkce_pair():
    verifier = _base64url(secrets.token_bytes(64))
    challenge = _base64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


def build_authorize_url():
    verifier, challenge = make_pkce_pair()
    state = secrets.token_urlsafe(24)
    session["spotify_pkce_verifier"] = verifier
    session["spotify_oauth_state"] = state

    params = {
        "client_id": _client_id(),
        "response_type": "code",
        "redirect_uri": _redirect_uri(),
        "scope": SCOPES,
        "state": state,
        "code_challenge_method": "S256",
        "code_challenge": challenge,
    }
    return f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"


def exchange_code(code, state):
    if not code:
        raise SpotifyError("Missing authorization code", 400)
    if state != session.get("spotify_oauth_state"):
        raise SpotifyError("Invalid OAuth state", 400)

    verifier = session.get("spotify_pkce_verifier")
    data = {
        "client_id": _client_id(),
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": _redirect_uri(),
        "code_verifier": verifier,
    }
    if _client_secret():
        data["client_secret"] = _client_secret()

    token = _token_request(data)
    save_token(token)
    session.pop("spotify_pkce_verifier", None)
    session.pop("spotify_oauth_state", None)


def _token_request(data):
    response = requests.post(SPOTIFY_TOKEN_URL, data=data, timeout=15)
    if response.status_code >= 400:
        raise SpotifyError("Spotify token exchange failed", response.status_code, response.json())
    return response.json()


def save_token(token):
    session["spotify_token"] = {
        "access_token": token["access_token"],
        "refresh_token": token.get("refresh_token") or session.get("spotify_token", {}).get("refresh_token"),
        "expires_at": int(time.time()) + int(token.get("expires_in", 3600)) - 60,
        "scope": token.get("scope", ""),
        "token_type": token.get("token_type", "Bearer"),
    }


def clear_token():
    session.pop("spotify_token", None)


def current_token():
    token = session.get("spotify_token")
    if not token:
        raise SpotifyError("Not authenticated", 401)
    if token.get("expires_at", 0) <= int(time.time()):
        refresh_token(token)
    return session["spotify_token"]["access_token"]


def refresh_token(token):
    refresh = token.get("refresh_token")
    if not refresh:
        clear_token()
        raise SpotifyError("Session expired", 401)

    data = {
        "client_id": _client_id(),
        "grant_type": "refresh_token",
        "refresh_token": refresh,
    }
    if _client_secret():
        data["client_secret"] = _client_secret()
    save_token(_token_request(data))


def api_request(method, path, **kwargs):
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {current_token()}"
    headers.setdefault("Content-Type", "application/json")

    response = requests.request(
        method,
        f"{SPOTIFY_API_BASE}{path}",
        headers=headers,
        timeout=20,
        **kwargs,
    )
    if response.status_code == 204:
        return {}
    try:
        payload = response.json()
    except ValueError:
        payload = {"error": response.text}
    if response.status_code >= 400:
        raise SpotifyError("Spotify API request failed", response.status_code, payload)
    return payload


def me():
    return api_request("GET", "/me")


def search_tracks(query, limit=20):
    return api_request(
        "GET",
        "/search",
        params={"q": query, "type": "track", "limit": min(max(int(limit), 1), 50)},
    )


def recommendations(params):
    allowed = {
        "limit",
        "seed_artists",
        "seed_genres",
        "seed_tracks",
        "min_energy",
        "max_energy",
        "target_energy",
        "min_valence",
        "max_valence",
        "target_valence",
        "min_danceability",
        "max_danceability",
        "target_danceability",
        "min_tempo",
        "max_tempo",
        "target_tempo",
    }
    clean = {key: value for key, value in params.items() if key in allowed and value not in ("", None)}
    clean["limit"] = min(max(int(clean.get("limit", 20)), 1), 50)
    return api_request("GET", "/recommendations", params=clean)


def genres():
    return api_request("GET", "/recommendations/available-genre-seeds")


def create_playlist(user_id, name, description, track_uris):
    playlist = api_request(
        "POST",
        f"/users/{user_id}/playlists",
        json={
            "name": name,
            "description": description or "",
            "public": False,
        },
    )
    playlist_id = playlist["id"]
    for index in range(0, len(track_uris), 100):
        api_request(
            "POST",
            f"/playlists/{playlist_id}/tracks",
            json={"uris": track_uris[index : index + 100]},
        )
    return playlist
