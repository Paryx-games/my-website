const LANGUAGE_COLORS: Record<string, string> = {
  "C": "#555555",
  "C#": "#178600",
  "C++": "#f34b7d",
  "CMake": "#DA3434",
  "CSS": "#563d7c",
  "Dart": "#00B4AB",
  "Go": "#00ADD8",
  "HTML": "#e34c26",
  "Java": "#b07219",
  "JavaScript": "#f1e05a",
  "Kotlin": "#A97BFF",
  "Lua": "#000080",
  "Objective-C": "#438eff",
  "PHP": "#4F5D95",
  "Python": "#3572A5",
  "Ruby": "#701516",
  "Rust": "#dea584",
  "SCSS": "#c6538c",
  "Shell": "#89e051",
  "Svelte": "#ff3e00",
  "Swift": "#F05138",
  "TypeScript": "#3178c6",
  "Vue": "#41b883",
  "WebAssembly": "#04133b",
};

export function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] ?? "#8b949e";
}
