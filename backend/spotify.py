import base64
import hashlib
import json
import os
import random
import secrets
import time
from urllib.parse import urlencode

import requests
from flask import session


SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SCOPES = "playlist-modify-public playlist-modify-private user-read-private"
DEFAULT_GENRES = [
    "pop",
    "rock",
    "hip-hop",
    "electronic",
    "dance",
    "r-n-b",
    "indie",
    "alternative",
    "metal",
    "punk",
    "jazz",
    "soul",
    "country",
    "folk",
    "latin",
    "reggae",
    "classical",
]


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


def clamp_page_limit(limit):
    return min(max(int(limit), 1), 10)


def clamp_total_limit(limit):
    return min(max(int(limit), 1), 50)


def search_page(query, item_type="track", limit=10, offset=0):
    return api_request(
        "GET",
        "/search",
        params={"q": query, "type": item_type, "limit": clamp_page_limit(limit), "offset": max(int(offset), 0)},
    )


def search_artists(query, limit=10):
    return search_page(query, "artist", limit)


def unique_tracks(items):
    seen = set()
    tracks = []
    for track in items:
        track_id = track.get("id")
        if not track_id or track_id in seen:
            continue
        seen.add(track_id)
        tracks.append(track)
    return tracks


def search_tracks(query, limit=20, offset=0, variance=False):
    total_limit = clamp_total_limit(limit)
    page_offsets = list(range(max(int(offset), 0), max(int(offset), 0) + total_limit + 30, 10))
    if variance:
        base_offsets = list(range(0, 200, 10))
        random.shuffle(base_offsets)
        page_offsets = base_offsets[: max(6, (total_limit // 10) + 3)]

    items = []
    last_payload = None
    for page_offset in page_offsets:
        payload = search_page(query, "track", 10, page_offset)
        last_payload = payload
        page_items = payload.get("tracks", {}).get("items") or []
        items.extend(page_items)
        items = unique_tracks(items)
        if len(items) >= total_limit:
            break
        if not payload.get("tracks", {}).get("next"):
            break

    payload = last_payload or {"tracks": {"items": []}}
    payload["tracks"]["items"] = items[:total_limit]
    payload["tracks"]["limit"] = total_limit
    payload["tracks"]["offset"] = int(offset or 0)
    return payload


def search_track_variants(queries, limit=20):
    total_limit = clamp_total_limit(limit)
    items = []
    usable_queries = [query for query in queries if query.strip()]
    random.shuffle(usable_queries)
    for query in usable_queries:
        payload = search_tracks(query, max(10, total_limit), variance=True)
        items.extend(payload.get("tracks", {}).get("items") or [])
        items = unique_tracks(items)
        if len(items) >= total_limit:
            break
    return {"tracks": {"items": items[:total_limit], "limit": total_limit, "offset": 0}}


def recommendations(params):
    genres = [genre for genre in (params.get("seed_genres") or "").split(",") if genre]
    artist_names = [artist for artist in (params.get("seed_artist_names") or "").split(",") if artist]
    queries = []
    if genres and artist_names:
        for genre in genres[:3]:
            for artist in artist_names[:3]:
                queries.append(f"genre:{genre} {artist}")
    elif genres:
        queries.extend([f"genre:{genre}" for genre in genres[:3]])
    elif artist_names:
        queries.extend(artist_names[:5])
    else:
        queries.extend(["tag:new", "tag:hipster", "year:2020-2026"])
    return search_track_variants(queries, params.get("limit", 20))


def era_search(params):
    genre = (params.get("genre") or "").strip()
    start = int(params.get("yearStart") or params.get("year_start") or 2010)
    end = int(params.get("yearEnd") or params.get("year_end") or start)
    if start > end:
        start, end = end, start

    years = list(range(start, end + 1))
    random.shuffle(years)
    decade_query = f"genre:{genre} year:{start}-{end}" if genre else f"year:{start}-{end}"
    queries = [decade_query]
    queries.extend(f"genre:{genre} year:{year}" if genre else f"year:{year}" for year in years[:10])
    return search_track_variants(queries, params.get("limit", 30))


def genres():
    return {"genres": DEFAULT_GENRES}


def vibe_plan(prompt):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise SpotifyError("AI vibe planning is not configured", 503)

    model = os.environ.get("AI_MODEL", "claude-haiku-4-5-20251001")
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": 900,
            "temperature": 0.4,
            "system": (
                "You convert loose playlist vibes into practical Spotify Web API search plans. "
                "Return only compact JSON with keys: mode, genre, yearStart, yearEnd, seedArtists, "
                "seedGenres, manualQuery, queryVariants, notes. Use common Spotify genre tags. "
                "Do not invent obscure parameters. queryVariants must be usable Spotify search strings."
            ),
            "messages": [{"role": "user", "content": prompt[:1200]}],
        },
        timeout=20,
    )
    payload = response.json()
    if response.status_code >= 400:
        raise SpotifyError("AI vibe planning failed", response.status_code, payload)

    text = "".join(part.get("text", "") for part in payload.get("content", []) if part.get("type") == "text").strip()
    try:
        plan = json.loads(text)
    except json.JSONDecodeError as exc:
        raise SpotifyError("AI returned an invalid plan", 502, {"error": str(exc), "raw": text})
    return {"plan": plan}


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
