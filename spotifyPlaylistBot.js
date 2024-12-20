// Import required libraries
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
require("dotenv").config();

// Spotify API credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Initialize Telegram bot (using webhook)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Variable to store Spotify access token
let spotifyAccessToken = "";

// Define your webhook URL (Vercel's deployment URL)
const WEBHOOK_URL = "https://spotify-playlist-bot.vercel.app/"; // Replace with your Vercel URL

// Set the webhook for the bot to use
bot.setWebHook(`${WEBHOOK_URL}${TELEGRAM_BOT_TOKEN}`);

// Function to fetch Spotify Access Token
async function fetchSpotifyToken() {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString(
              "base64"
            ),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    spotifyAccessToken = response.data.access_token;
    console.log("Spotify Access Token fetched successfully.");
  } catch (error) {
    console.error("Error fetching Spotify Access Token:", error.message);
  }
}

// Function to fetch playlist songs from Spotify
async function getPlaylistSongs(playlistId) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: { Authorization: `Bearer ${spotifyAccessToken}` },
      }
    );

    // Extract song names and artists
    const songs = response.data.items.map(
      (item) =>
        `${item.track.name} - ${item.track.artists
          .map((artist) => artist.name)
          .join(", ")}`
    );

    return songs;
  } catch (error) {
    console.error("Error fetching playlist songs:", error.message);
    return [];
  }
}

// Webhook request handler
const express = require("express");
const app = express();
app.use(express.json());

// Handle incoming updates (messages, commands)
app.post(`/`, async (req, res) => {
  const msg = req.body;
  const chatId = msg.chat.id;
  const text = msg.text;

  // Check if the message contains a Spotify playlist link
  const match = text.match(/playlist\/([a-zA-Z0-9]+)/);
  if (!match) {
    await bot.sendMessage(
      chatId,
      "Please send a valid Spotify playlist link. Example: https://open.spotify.com/playlist/{playlist_id}"
    );
    return res.send("ok");
  }

  const playlistId = match[1];

  // Fetch Spotify Access Token
  await fetchSpotifyToken();

  // Get Playlist Songs
  const songs = await getPlaylistSongs(playlistId);

  // Send the song names back to the user
  if (songs.length > 0) {
    await bot.sendMessage(chatId, "Here are the songs in your playlist:\n\n" + songs.join("\n"));
  } else {
    await bot.sendMessage(chatId, "Could not fetch songs from the playlist. Please try again.");
  }

  res.send("ok");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
