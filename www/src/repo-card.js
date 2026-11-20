const stroke =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
export const cardIcons = {
  copy: `<svg ${stroke}><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>`,
  check: `<svg ${stroke}><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  launch: `<svg ${stroke}><path d="M14 5h5v5"/><path d="M10 14 19 5"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>`,
};

const forkIcon =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0Z"/></svg>';
const escapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
export const escapeCardText = (value) =>
  String(value).replace(/[&<>"']/g, (char) => escapes[char]);

export function renderRepoCard({
  title,
  copyValue,
  description,
  icon,
  url,
  linkTip,
  linkLabel,
  footer,
  parent = "",
  classes = "",
  style = "",
  fullName,
  languageBarLabel,
}) {
  const escape = escapeCardText;
  const copyLabel = escape(`Copy ${copyValue}`);
  const open = url
    ? `<a class="icon-btn repo-open" href="${escape(url)}" target="_blank" rel="noopener noreferrer" data-tip="${escape(linkTip)}" aria-label="${escape(linkLabel)}">${cardIcons.launch}</a>`
    : `<button class="icon-btn repo-open" type="button" disabled data-tip="No link configured" aria-label="${escape(`No link configured for ${title}`)}">${cardIcons.launch}</button>`;
  return `<article class="repo${classes ? ` ${escape(classes)}` : ""}" style="${escape(style)}"${fullName ? ` data-repo-full-name="${escape(fullName)}"` : ""}>
  <div class="repo-head">
    <div class="repo-title"><span class="repo-origin-icon" aria-hidden="true">${icon}${classes.includes("is-fork") ? `<span class="repo-fork-badge">${forkIcon}</span>` : ""}</span><span class="repo-name">${escape(title)}</span><button class="icon-btn repo-copy" type="button" data-repo-copy="${escape(copyValue)}" data-tip="${copyLabel}" aria-label="${copyLabel}"><span class="i-copy">${cardIcons.copy}</span><span class="i-check">${cardIcons.check}</span></button></div>
    <div class="repo-actions">${open}</div>
  </div>
  <p class="repo-parent"${parent ? "" : " hidden"}>${parent}</p>
  <p class="repo-desc">${escape(description)}</p>
  <div class="repo-foot">${footer}</div>
  <div class="repo-languages" ${languageBarLabel ? `aria-label="${escape(languageBarLabel)}"` : 'aria-hidden="true"'}></div>
  <span class="sr-only" role="status"></span>
</article>`;
}
