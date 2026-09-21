const USER_ID_PATTERN = /^\d{17,20}$/;

const send = (res, status, body) => {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
  res.send(JSON.stringify(body));
};

const numericTimestamp = (value) => {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "Method not allowed" });
  }

  const userId = String(process.env.DISCORD_USER_ID || "").trim();

  if (!USER_ID_PATTERN.test(userId)) {
    return send(res, 500, { error: "Discord presence is not configured" });
  }

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return send(res, 502, { error: "Discord presence provider unavailable" });
    }

    const payload = await response.json();
    const data = payload?.data;

    if (!payload?.success || !data?.discord_user) {
      return send(res, 502, { error: "Discord presence data unavailable" });
    }

    const user = data.discord_user;
    const activities = Array.isArray(data.activities)
      ? data.activities.map((activity) => ({
          type: activity?.type ?? null,
          name: activity?.name || "",
          details: activity?.details || "",
          state: activity?.state || "",
          applicationId: activity?.application_id || "",
          timestamps: {
            start: numericTimestamp(activity?.timestamps?.start),
            end: numericTimestamp(activity?.timestamps?.end)
          },
          assets: {
            largeImage: activity?.assets?.large_image || "",
            largeText: activity?.assets?.large_text || "",
            smallImage: activity?.assets?.small_image || "",
            smallText: activity?.assets?.small_text || ""
          }
        }))
      : [];

    const spotify = data.spotify
      ? {
          song: data.spotify.song || "",
          artist: data.spotify.artist || "",
          album: data.spotify.album || "",
          albumArtUrl: data.spotify.album_art_url || "",
          timestamps: {
            start: numericTimestamp(data.spotify?.timestamps?.start),
            end: numericTimestamp(data.spotify?.timestamps?.end)
          }
        }
      : null;

    return send(res, 200, {
      user: {
        id: user.id || userId,
        username: user.username || "",
        displayName: user.global_name || user.display_name || user.username || "",
        avatar: user.avatar || ""
      },
      status: data.discord_status || "offline",
      spotify,
      activities
    });
  } catch {
    return send(res, 502, { error: "Discord presence provider unavailable" });
  }
}
