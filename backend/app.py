import os

from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS

from spotify import (
    SpotifyError,
    build_authorize_url,
    clear_token,
    create_playlist,
    exchange_code,
    genres,
    era_search,
    me,
    recommendations,
    search_artists,
    generous_search,
    search_tracks,
    vibe_plan,
)


def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE=os.environ.get("SESSION_COOKIE_SAMESITE", "Lax"),
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true",
    )
    cors_origins = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:5174").split(",")
    CORS(app, supports_credentials=True, origins=cors_origins)

    @app.errorhandler(SpotifyError)
    def handle_spotify_error(error):
        return jsonify(error.payload), error.status_code

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @app.get("/api/auth/login")
    def login():
        if not os.environ.get("SPOTIFY_CLIENT_ID"):
            return jsonify({"error": "SPOTIFY_CLIENT_ID is not configured"}), 500
        return redirect(build_authorize_url())

    @app.get("/api/auth/callback")
    def callback():
        exchange_code(request.args.get("code"), request.args.get("state"))
        return redirect(os.environ.get("AUTH_SUCCESS_REDIRECT", "http://localhost:5174"))

    @app.post("/api/auth/logout")
    def logout():
        clear_token()
        return {"ok": True}

    @app.get("/api/auth/me")
    def auth_me():
        return jsonify({"user": me()})

    @app.get("/api/search")
    def search():
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"tracks": {"items": []}})
        if request.args.get("generous", "false").lower() == "true":
            return jsonify(generous_search(query, request.args.get("limit", 20)))
        return jsonify(
            search_tracks(
                query,
                request.args.get("limit", 20),
                request.args.get("offset", 0),
                request.args.get("variance", "false").lower() == "true",
            )
        )

    @app.get("/api/artists/search")
    def artist_search():
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"artists": {"items": []}})
        return jsonify(search_artists(query, request.args.get("limit", 10)))

    @app.get("/api/recommendations")
    def get_recommendations():
        return jsonify(recommendations(request.args.to_dict()))

    @app.get("/api/era-search")
    def get_era_search():
        return jsonify(era_search(request.args.to_dict()))

    @app.post("/api/vibe-plan")
    def get_vibe_plan():
        payload = request.get_json(force=True) or {}
        prompt = (payload.get("prompt") or "").strip()
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        return jsonify(vibe_plan(prompt))

    @app.get("/api/genres")
    def get_genres():
        return jsonify(genres())

    @app.post("/api/playlist/create")
    def playlist_create():
        payload = request.get_json(force=True) or {}
        name = (payload.get("name") or "").strip()
        track_ids = payload.get("trackIds") or []
        description = payload.get("description") or ""
        if not name:
            return jsonify({"error": "Playlist name is required"}), 400
        if not track_ids:
            return jsonify({"error": "At least one track is required"}), 400

        user = me()
        uris = [track_id if track_id.startswith("spotify:track:") else f"spotify:track:{track_id}" for track_id in track_ids]
        playlist = create_playlist(user["id"], name, description, uris)
        return jsonify({"playlist": playlist})

    return app


app = create_app()


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=debug)
