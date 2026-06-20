export interface CloudFileResult {
  name: string
  bytes: number
  link: string
  provider: 'dropbox' | 'onedrive' | 'google'
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.id = id
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${id}`))
    document.body.appendChild(s)
  })
}

export async function openDropboxPicker(appKey: string): Promise<CloudFileResult> {
  await loadScript('https://www.dropbox.com/static/api/2/dropins.js', 'dropboxjs')
  ;(document.getElementById('dropboxjs') as HTMLScriptElement).setAttribute('data-app-key', appKey)
  return new Promise((resolve, reject) => {
    const Dropbox = (window as any).Dropbox
    if (!Dropbox) return reject(new Error('Dropbox Chooser not available'))
    Dropbox.choose({
      success: (files: any[]) => {
        const f = files[0]
        resolve({ name: f.name, bytes: f.bytes, link: f.link, provider: 'dropbox' })
      },
      cancel: () => reject(new Error('Cancelled')),
      linkType: 'direct',
      multiselect: false,
      extensions: ['.csv', '.xlsx', '.xls', '.qif', '.ofx', '.pdf', '.json'],
    })
  })
}

export async function openOneDrivePicker(clientId: string): Promise<CloudFileResult> {
  await loadScript('https://js.live.net/v7.2/OneDrive.js', 'onedrive-sdk')
  return new Promise((resolve, reject) => {
    const OneDrive = (window as any).OneDrive
    if (!OneDrive) return reject(new Error('OneDrive picker not available'))
    OneDrive.open({
      clientId,
      action: 'share',
      multiSelect: false,
      success: (files: any[]) => {
        const f = files[0]
        resolve({ name: f.name || f.fileName, bytes: f.size || 0, link: f.downloadUrl || f.link, provider: 'onedrive' })
      },
      cancel: () => reject(new Error('Cancelled')),
    })
  })
}

export async function downloadCloudFile(result: CloudFileResult): Promise<File> {
  const res = await fetch(result.link)
  const blob = await res.blob()
  return new File([blob], result.name, { type: blob.type })
}
