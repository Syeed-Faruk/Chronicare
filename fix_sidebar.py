
from pathlib import Path
from datetime import datetime
import shutil
import re

ROOT = Path(r"D:\CHRONICARE")
PATIENT = ROOT / "frontend" / "patient"

# Map each visible sidebar label to its HTML page.
LINKS = {
    "Dashboard": "dashboard.html",
    "Health Monitoring": "health-monitoring.html",
    "Health History": "health-history.html",
    "Health Trends": "health-trends.html",
    "Analytics": "analytics.html",
    "Risk Status": "risk-status.html",
    "Alerts": "alerts.html",
    "Appointments": "appointments.html",
    "Follow-Up": "follow-up.html",
    "My Profile": "profile.html",
}

if not PATIENT.is_dir():
    raise SystemExit(f"Patient folder not found: {PATIENT}")

# Only target sidebar navigation sections.
nav_pattern = re.compile(
    r'(<nav\b[^>]*class=["\'][^"\']*sidebar-nav[^"\']*["\'][^>]*>)'
    r'(.*?)'
    r'(</nav\s*>)',
    re.I | re.S,
)

link_pattern = re.compile(
    r'<a\b([^>]*)>(.*?)</a\s*>',
    re.I | re.S,
)

label_pattern = re.compile(r"<[^>]+>")
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup = ROOT / f"sidebar_backup_{timestamp}"

# Only use pages that actually exist.
existing = {
    label: filename
    for label, filename in LINKS.items()
    if (PATIENT / filename).is_file()
}

changed_files = 0
changed_links = 0

for file in PATIENT.glob("*.html"):
    original = file.read_text(encoding="utf-8-sig")
    count = [0]

    def fix_nav(nav_match):
        def fix_link(link_match):
            attrs, body = link_match.groups()
            label = " ".join(
                label_pattern.sub("", body).split()
            ).strip()

            target = existing.get(label)
            if not target:
                return link_match.group(0)

            href = re.search(
                r'\bhref\s*=\s*(["\'])(.*?)\1',
                attrs,
                re.I | re.S,
            )

            # Keep already working links unchanged.
            if href and href.group(2).strip() not in ("", "#"):
                return link_match.group(0)

            # Skip links without href rather than guessing.
            if not href:
                return link_match.group(0)

            attrs = re.sub(
                r'\bhref\s*=\s*(["\'])(.*?)\1',
                f'href="{target}"',
                attrs,
                count=1,
                flags=re.I | re.S,
            )
            count[0] += 1
            return f"<a{attrs}>{body}</a>"

        opening, content, closing = nav_match.groups()
        content = link_pattern.sub(fix_link, content)
        return opening + content + closing

    updated = nav_pattern.sub(fix_nav, original)

    if updated != original:
        backup.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, backup / file.name)
        file.write_text(updated, encoding="utf-8")
        changed_files += 1
        changed_links += count[0]
        print(f"Updated {file.name}: {count[0]} links")

print("\n--- RESULT ---")
print(f"Files changed: {changed_files}")
print(f"Links fixed: {changed_links}")
print(f"Backup folder: {backup if changed_files else 'No changes made'}")

if not existing:
    print("WARNING: None of the expected destination pages were found.")

print("Done.")
