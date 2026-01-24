# Roll for Shoes: Owlbear Rodeo Edition 🎲👟

![Roll for Shoes Logo](./public/apple-touch-icon.png)

## Level Up Your Chaos

Ready to fail forward? **Roll for Shoes** is the micro-RPG where you start with nothing and end up... well, probably exploding, but with *style*. And now, it's directly inside **Owlbear Rodeo**!

### Why You Need This Extension

- **Instant Character Creation:** Create "Do Anything 1" nobodies in seconds.
- **XP Management:** Track your failures (XP) and spend them on glorious new skills.
- **Skill Trees:** Visualize your character's ridiculous evolution from "Do Anything" to "Underwater Basket Weaving 6".
- **Token Linking:** Link your character sheet to your token so everyone knows exactly who is rolling for what.
- **Data Persistence:** Your glorious failures are saved automatically in the room.

### 🚀 How to Play

1. **Say what you do.**
2. **Roll some dice.** (If you have a relevant skill, roll that many d6s!)
3. **Did you roll all 6s?** Congrats! You get a new skill at one level higher!
4. **Did you fail?** Take 1 XP. (Failures are just future successes in disguise.)

### 🛠️ Development & Installation

Want to hack on this? Here's how to get the dev server running:

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Setup SSL (One-time):**
   This extension requires HTTPS. We use `mkcert`:

   ```bash
   choco install mkcert
   mkcert -install
   mkcert localhost 127.0.0.1 ::1
   mkdir certs
   mv localhost*.pem certs/
   ```

3. **Run the Dev Server:**

   ```bash
   npm run dev
   ```

4. **Add to Owlbear Rodeo:**
   - Go to your Owlbear Rodeo Room.
   - Click **Extensions** (the puzzle piece).
   - Click **Load Custom Extension**.
   - URL: `https://localhost:5173/manifest.json`

### 📜 Credits

Based on the "Roll for Shoes" micro-system.
Built with ❤️ for Owlbear Rodeo.
