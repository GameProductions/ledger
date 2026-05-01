import os
import glob

replacements = {
    "op://6wgu5yz5yphvacdimgc64ej65i/Cloudflare - GitHub Actions/CLOUDFLARE_API_TOKEN": "op://6wgu5yz5yphvacdimgc64ej65i/ai5ikix3ghnryezfrrygzgeq3e/CLOUDFLARE_API_TOKEN",
    "op://6wgu5yz5yphvacdimgc64ej65i/Cloudflare - GitHub Actions/CLOUDFLARE_ACCOUNT_ID": "op://6wgu5yz5yphvacdimgc64ej65i/vzqtt3fqxw242wfhvxthgpnfou/CLOUDFLARE_ACCOUNT_ID",
    "op://6wgu5yz5yphvacdimgc64ej65i/Fleet-Wide - Shared Secrets/ENCRYPTION_KEY": "op://6wgu5yz5yphvacdimgc64ej65i/7r4z25yryhmf5h772m6twnpqoi/ENCRYPTION_KEY",
    "op://6wgu5yz5yphvacdimgc64ej65i/Fleet-Wide - Shared Secrets/SHARED_SERVICE_SECRET": "op://6wgu5yz5yphvacdimgc64ej65i/7r4z25yryhmf5h772m6twnpqoi/SHARED_SERVICE_SECRET"
}

workflows = glob.glob("/Users/morenicano/Documents/coding/projects/bots/*/.github/workflows/*.yml")

for wf in workflows:
    with open(wf, 'r') as f:
        content = f.read()
    
    modified = content
    for old, new in replacements.items():
        modified = modified.replace(old, new)
        
    if modified != content:
        print(f"Updated {wf}")
        with open(wf, 'w') as f:
            f.write(modified)
