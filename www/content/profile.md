<!-- IF YOU ARE READING THIS: PLEASE DO NOT OPEN A PR OR MESSAGE ME ASKING ME TO UPDATE THIS. I WILL UPDATE THIS REPOSITORY WHEN I CHOOSE TO. YOU ARE WELCOME TO FORK IT AND MAKE YOUR OWN CHANGES TO PUT ON YOUR OWN PROFILE, JUST MAKE SURE TO CHANGE ALL THE LINKS. -->

# Hi there! 😛

### Please visit [my website](https://paryx.uk/) instead of this page. This is just a summary of what the website says

I'm **paryx**, a hobbyist developer who enjoys building tools, websites, and other software projects. I'm also currently learning more about software engineering beyond just coding, including things like reverse engineering, networking, and how software works under the hood.

I make my projects open-source by default because I feel like sharing my knowledge with the internet is far better than keeping it proprietary. It also makes my projects easier for people to inspect and trust, since the source code is publicly available.

[![paryx on WhatTime.to](https://whattime.link/u/paryx?style=flat&size=compact&show=name,status,time&theme=dark&accent=7fb2e1&format=12h)](https://whattime.to/talk/paryx) [![Current time in London](https://whattime.link/tz/europe/london?style=flat&size=compact&show=name,time&theme=dark&accent=7fb2e1&format=12h)](https://whattime.to)

### Contact me

<a href="https://x.com/paryx_games"><img src="https://cdn.simpleicons.org/x/fff" width="24" alt="x"></a>
<a href="https://discord.com"><img src="https://cdn.simpleicons.org/discord/fff" width="24" alt="discord"></a>
<a href="mailto:paryx.games@gmail.com"><img src="https://cdn.simpleicons.org/gmail/fff" width="24" alt="email"></a>
<a href="https://www.reddit.com/user/Narrow_Proof4204/"><img src="https://cdn.simpleicons.org/reddit/fff" width="24" alt="reddit"></a>
<a href="https://www.roblox.com/users/1577142632/profile"><img src="https://cdn.simpleicons.org/roblox/fff" width="24" alt="roblox"></a>

### **About Me**

I can code in several languages! I've listed them below and ranked them based on my own level of experience, from strongest to still improving.

[![My Coding Languages](https://skillicons.dev/icons?i=lua,python,js,ts,rust,cpp)](https://skillicons.dev)

If you want to know more about my coding skills, I've made an expanded section covering my experience with specific languages.

<details>

<summary><strong>More Details</strong></summary>

<h3>
  <img src="https://skillicons.dev/icons?i=rust,cpp" alt="Rust & C++" height="37" align="middle">

  <br>

  Rust and C++
</h3>

I began using <img src="https://skillicons.dev/icons?i=cpp" alt="C++" height="17.5" align="bottom"> **C++** around October 2025. Before then, I had mostly used languages that relied on runtimes, which were simpler for me while I was still learning. Progress was slow at first and I ran into a lot of issues because this was my first serious experience with an ahead-of-time compiled language, unlike <img src="https://skillicons.dev/icons?i=py" alt="Python" height="17.5" align="bottom"> **Python** or <img src="https://skillicons.dev/icons?i=js" alt="JavaScript" height="17.5" align="bottom"> **JavaScript**. The compiler and tooling were quite fiddly for me to figure out at first. Fortunately, I started learning more about how everything worked from the docs (and with a little bit of help from ChatGPT) and eventually figured out the basics. I didn't publish many of the projects I made because I felt they lacked quality and weren't in a state where I wanted to make them public.

Then I discovered <img src="https://skillicons.dev/icons?i=rust" alt="Rust" height="17.5" align="bottom"> **Rust**. I thought nothing of it at first and assumed it was fairly similar to <img src="https://skillicons.dev/icons?i=cpp" alt="C++" height="17.5" align="bottom"> **C++** (which, on paper, is true, *in a way*). However, I then learned about the Cargo ecosystem and I was **hooked.** It felt like the Python/JavaScript package ecosystem, but for Rust. Since then, I've used Rust for a lot of projects, including my [Roblox Manager](https://github.com/Paryx-games/roblox-manager) project, which I originally forked from another developer. Since then, I've added a lot of features and am currently working on a major v2 rewrite. I've made more projects with Rust too, but this is one of the only public ones, as most of the others were experimental or never reached a state where I wanted to publish them.

<h3>
  <img src="https://skillicons.dev/icons?i=lua" alt="Lua" height="45" align="middle">

  <br>

  Lua & Luau
</h3>

I don't remember much about when I started learning Luau since it was over 5-6 years ago now, but I mostly learned from YouTube tutorials and Roblox documentation. I haven't used Lua itself as much, however I'm very strong in both Luau and Lua. I've made multiple games using Luau, although most were unpublished because I'm a neat freak and tend to want everything to be perfect.

Some examples include a partially unfinished Tower Defense game with functioning purchasing and placement systems, lobby transferring, matchmaking, and difficulty tiers. I left it because I felt it would be too much work for a solo developer like me. Like a lot of other games I tried to make, you also have to think about VFX, sound design, art direction, building, modelling, and everything else around the actual programming. I did have a small studio with a few developers over the years, with some leaving and others joining, but I never fully dedicated myself to it because I was young (and still am, ish), so it was much harder without a proper budget behind it. I raised about 15,000 Robux during the time I had the studio, which was an incredible achievement for me at the time and something I'm still really proud of. Smaller projects made under the studio included an obby, a huge adventure game which I'm still sort of working on but not really, a bunch of story/testing games, two core games (one was way better than the other), and countless other random projects.

One of the more annoying things about my Roblox games (and this is entirely my fault) is that I'd often get bored of making them after 3-4 days, which severely limited what I was hoping to build. I could obviously continue them, but with where I left many of them, I don't really know how I'd continue them now.

I'm very proud of a lot of my projects on Roblox, but I've gradually moved on to more general software projects, external tools for Roblox development, and expanding my knowledge of languages and tooling outside Roblox. I've had a lot of fun making games and experimenting on the platform, but Roblox game development just doesn't fit what I want to focus on anymore.

For Lua, I'm more experienced with Luau (Roblox-specific), but most of the skills carry over since Luau is a fork of Lua with extra features like the typing system, compound assignment operators like `+=`, `-=`, and **string interpolation**. I love string interpolation so much because it's really nice for keeping code clean. An example is below:

```lua
local world = "World"

print(`Hello {world}!`)
```

Output: `Hello World!`

Otherwise, with standard Lua, you would have to do something like this, which can sometimes be better, but string interpolation feels much nicer to me.

```lua
local player = "Alex"
local score = 50

-- Option 1: Concatenation (using dots)
print("Player " .. player .. " has a score of " .. score)

-- Option 2: Formatting (similar to C's printf)
print(string.format("Player %s has a score of %d", player, score))
```

Obviously that's personal preference, but I just feel like it's nicer. Moving on!

<h3>
  <img src="https://skillicons.dev/icons?i=js,ts,py" alt="JavaScript, TypeScript & Python" height="45" align="middle">

  <br>

  JavaScript, TypeScript and Python
</h3>

Since I've used all three extensively for scripting and application development, I've consolidated them into one section as it's cleaner.

I've used JavaScript and TypeScript extensively for Electron apps, websites, and React projects, with React being where I've used TypeScript the most. One thing that massively accelerated my JavaScript knowledge was building **Discord bots** (which is really surprising, I know).

Back in mid-2025 to early 2026, I used to make Discord bots for people for Robux or money. They were cheap and fairly easy for me to make, so I charged a low rate and made a decent amount of money from it, around £300. This helped fund my Roblox studio mentioned earlier, as well as some personal stuff in real life.

Here are some Robux transactions showing SOME of the money I received. This is only a small portion, as other transactions were handled with real money or through other methods.

<img src="https://media.paryx.uk/images/robux1.png" alt="First Robux page">

<br>

<img src="https://media.paryx.uk/images/robux2.png" alt="Second Robux page">

Usernames and other sensitive transaction information have been blurred for privacy. Dates and Robux amounts (after the 30% Robux tax) are shown.

I adapted a lot of my TypeScript knowledge from JavaScript, but React was where I really started learning it properly. I love TypeScript because it makes larger projects much easier to keep reliable. JavaScript is more flexible, but that flexibility can also make it easier to miss edge cases, which I hate having to test for when I just want to get something working quickly.

For Python, I've been using it for years and still come back to it regularly for scripts, automation, quick tools, and anything where I want to get something working without much setup. Its huge package ecosystem and simple syntax make it incredibly convenient, although over time I've started preferring languages like Rust and TypeScript for larger projects where I want stronger tooling, type safety, and more predictable behaviour.

Around mid-2025, I also discovered `uv`, which made working with Python much nicer for me. I now prefer it over using `pip` directly because it is extremely fast, handles environments and dependencies cleanly, and gives Python projects a much more modern workflow. I still don't use Python as much as I used to, but it remains one of those languages that is ridiculously useful to have around.

</details>

---

I also have skills in a few other tools, listed below.

[![My Skills](https://skillicons.dev/icons?i=cloudflare,discordjs,docker,electron,git,github,mongodb,pnpm,robloxstudio,vscode)](https://skillicons.dev)