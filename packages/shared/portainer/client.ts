/**
 * Portainer REST Client SDK
 * GameProductions Foundation Modular Gateway (Rule 26)
 */

import { 
  PortainerEnvironment, 
  PortainerStack, 
  PortainerContainer, 
  PortainerStackDetails,
  PortainerStackVolume,
  PortainerStackNetwork,
  PortainerStackImage,
  PortainerStackImageSummary,
  CreateEnvironmentPayload 
} from './types';

export interface PortainerClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class PortainerClient {
  private baseUrl: string;
  private apiKey: string;
  private fetchImpl: typeof fetch;

  constructor(opts: PortainerClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl || fetch.bind(globalThis);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const resp = await this.fetchImpl(url, {
      ...options,
      headers,
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Portainer API Error [${resp.status}]: ${errorText || resp.statusText}`);
    }

    if (resp.status === 204) {
      return {} as T;
    }

    return (await resp.json()) as T;
  }

  /**
   * List all registered Portainer environments (endpoints) with container metrics
   */
  async getEnvironments(): Promise<PortainerEnvironment[]> {
    const rawEndpoints = await this.request<any[]>('/endpoints');
    
    return rawEndpoints.map(ep => {
      const hasDockerSnapshot = Boolean(ep.Snapshots && ep.Snapshots.length > 0 && ep.Snapshots[0]?.DockerVersion);
      const isHealthySnapshot = hasDockerSnapshot && !ep.Snapshots[0]?.SnapshotRaw?.SnapshotError;
      
      let status: 'up' | 'down' | 'degraded' = 'down';
      if (ep.Status === 1 && isHealthySnapshot) {
        status = 'up';
      } else if (ep.Status === 1 && !hasDockerSnapshot) {
        // Registered in Portainer but not yet reachable / snapshot pending / agent not connected
        status = 'degraded';
      } else if (ep.Status === 3 || (hasDockerSnapshot && ep.Snapshots[0]?.UnhealthyContainerCount > 0)) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      return {
        id: ep.Id,
        name: ep.Name,
        type: ep.Type,
        url: ep.URL,
        status,
        groupId: ep.GroupId || 1,
        totalContainers: hasDockerSnapshot ? (ep.Snapshots[0].RunningContainerCount + ep.Snapshots[0].StoppedContainerCount) : 0,
        runningContainers: ep.Snapshots?.[0]?.RunningContainerCount || 0,
        stoppedContainers: ep.Snapshots?.[0]?.StoppedContainerCount || 0,
        healthyContainers: ep.Snapshots?.[0]?.HealthyContainerCount || 0,
        unhealthyContainers: ep.Snapshots?.[0]?.UnhealthyContainerCount || 0,
        totalImages: ep.Snapshots?.[0]?.ImageCount || 0,
        totalVolumes: ep.Snapshots?.[0]?.VolumeCount || 0,
        totalStacks: ep.Snapshots?.[0]?.StackCount || 0,
        dockerVersion: ep.Snapshots?.[0]?.DockerVersion,
        publicUrl: ep.PublicURL,
        tags: ep.TagIds?.map((t: number) => `tag-${t}`) || [],
      };
    });
  }

  /**
   * Provision a new environment into the Portainer server
   */
  async createEnvironment(payload: CreateEnvironmentPayload): Promise<PortainerEnvironment> {
    const body: Record<string, any> = {
      Name: payload.name,
      EndpointType: payload.type,
      URL: payload.url,
      PublicURL: payload.publicUrl || '',
      GroupId: payload.groupId || 1,
      TagIds: [],
    };

    if (payload.type === 2) {
      // Portainer Agent TCP
      body.TLS = payload.tls?.skipVerify !== undefined ? {
        TLS: true,
        TLSSkipVerify: payload.tls.skipVerify
      } : { TLS: false };
    }

    const created = await this.request<any>('/endpoints', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: created.Id,
      name: created.Name,
      type: created.Type,
      url: created.URL,
      status: 'up',
      groupId: created.GroupId || 1,
      totalContainers: 0,
      runningContainers: 0,
      stoppedContainers: 0,
      healthyContainers: 0,
      unhealthyContainers: 0,
      totalImages: 0,
      totalVolumes: 0,
      totalStacks: 0,
    };
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(id: number): Promise<void> {
    await this.request(`/endpoints/${id}`, { method: 'DELETE' });
  }

  /**
   * Update an existing environment
   */
  async updateEnvironment(id: number, payload: Partial<CreateEnvironmentPayload>): Promise<PortainerEnvironment> {
    const body: Record<string, any> = {};
    if (payload.name !== undefined) body.Name = payload.name;
    if (payload.type !== undefined) body.EndpointType = payload.type;
    if (payload.url !== undefined) body.URL = payload.url;
    if (payload.publicUrl !== undefined) body.PublicURL = payload.publicUrl;
    if (payload.groupId !== undefined) body.GroupId = payload.groupId;
    
    if (payload.tls?.skipVerify !== undefined) {
      body.TLS = {
        TLS: true,
        TLSSkipVerify: payload.tls.skipVerify
      };
    }

    const updated = await this.request<any>(`/endpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return {
      id: updated.Id,
      name: updated.Name,
      type: updated.Type,
      url: updated.URL,
      status: updated.Status === 1 ? 'up' : 'down',
      groupId: updated.GroupId || 1,
      totalContainers: 0,
      runningContainers: 0,
      stoppedContainers: 0,
      healthyContainers: 0,
      unhealthyContainers: 0,
      totalImages: 0,
      totalVolumes: 0,
      totalStacks: 0,
    };
  }

  /**
   * List all stacks across environments (or filtered by endpointId)
   */
  async getStacks(endpointId?: number): Promise<PortainerStack[]> {
    const rawStacks = await this.request<any[]>('/stacks');
    
    const filtered = endpointId ? rawStacks.filter(s => s.EndpointId === endpointId) : rawStacks;

    return filtered.map(st => {
      const isRunning = st.Status === 1;
      return {
        id: st.Id,
        name: st.Name,
        type: st.Type,
        endpointId: st.EndpointId,
        status: st.Status,
        statusLabel: isRunning ? 'running' : 'stopped',
        entryPoint: st.EntryPoint || 'docker-compose.yml',
        projectPath: st.ProjectPath || '',
        creationDate: st.CreationDate * 1000,
        updateDate: (st.UpdateDate || st.CreationDate) * 1000,
        updatedBy: st.UpdatedBy || 'system',
        autoUpdate: !!st.AutoUpdate,
        namedVolumes: [],
        hostMounts: [],
        env: st.Env || [],
        websiteUrl: `https://${st.Name}.gameproductions.net`,
      };
    });
  }

  /**
   * Fetch raw compose content for a stack
   */
  async getStackFile(stackId: number): Promise<string> {
    const res = await this.request<{ StackFileContent: string }>(`/stacks/${stackId}/file`);
    return res.StackFileContent || '';
  }

  /**
   * Update stack compose file & variables
   */
  async updateStack(
    stackId: number, 
    endpointId: number, 
    stackFileContent: string, 
    env: Array<{ name: string; value: string }> = []
  ): Promise<void> {
    await this.request(`/stacks/${stackId}?endpointId=${endpointId}`, {
      method: 'PUT',
      body: JSON.stringify({
        stackFileContent,
        env,
        prune: false,
      }),
    });
  }

  /**
   * Trigger stack lifecycle action (start, stop, restart, pause, unpause)
   */
  async stackAction(endpointId: number, stackId: number, action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause'): Promise<void> {
    if (action === 'start' || action === 'stop') {
      await this.request(`/stacks/${stackId}/${action}?endpointId=${endpointId}`, {
        method: 'POST',
      });
      return;
    }

    // For restart, pause, unpause: apply across all containers associated with the stack
    const containers = await this.getContainers(endpointId);
    const stack = (await this.getStacks(endpointId)).find(s => s.id === stackId);
    const stackName = stack?.name.toLowerCase();

    const targets = containers.filter(c => 
      (c.stackName && c.stackName.toLowerCase() === stackName) ||
      (stackName && c.names.some(n => n.toLowerCase().includes(stackName)))
    );

    for (const c of targets) {
      if (action === 'restart') {
        await this.containerAction(endpointId, c.id, 'restart');
      } else if (action === 'pause') {
        await this.request(`/endpoints/${endpointId}/docker/containers/${c.id}/pause`, { method: 'POST' });
      } else if (action === 'unpause') {
        await this.request(`/endpoints/${endpointId}/docker/containers/${c.id}/unpause`, { method: 'POST' });
      }
    }
  }

  /**
   * Create a new stack on an environment
   */
  async createStack(endpointId: number, name: string, stackFileContent: string, env: Array<{ name: string; value: string }> = []): Promise<PortainerStack> {
    const created = await this.request<any>(`/stacks/create/standalone/string?endpointId=${endpointId}`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        stackFileContent,
        env,
        fromAppTemplate: false,
      }),
    });
    return {
      id: created.Id,
      name: created.Name,
      type: created.Type || 2,
      endpointId: created.EndpointId || endpointId,
      status: created.Status || 1,
      statusLabel: 'running',
      entryPoint: created.EntryPoint || 'docker-compose.yml',
      projectPath: created.ProjectPath || '',
      creationDate: (created.CreationDate || Date.now() / 1000) * 1000,
      updateDate: Date.now(),
      updatedBy: created.UpdatedBy || 'system',
      namedVolumes: [],
      hostMounts: [],
      env: env,
    };
  }

  /**
   * Delete a stack
   */
  async deleteStack(endpointId: number, stackId: number, prune: boolean = false): Promise<void> {
    await this.request(`/stacks/${stackId}?endpointId=${endpointId}&prune=${prune}`, {
      method: 'DELETE',
    });
  }

  /**
   * Fetch comprehensive stack details (volumes, networks, envs, images, containers)
   */
  async getStackDetails(endpointId: number, stackId: number): Promise<PortainerStackDetails> {
    const stacks = await this.getStacks(endpointId);
    const stack = stacks.find(s => s.id === stackId);
    if (!stack) {
      throw new Error(`Stack ${stackId} not found in environment ${endpointId}`);
    }

    const composeFile = await this.getStackFile(stackId);
    const allContainers = await this.getContainers(endpointId);

    const stackContainers = allContainers.filter(c => 
      (c.stackName && c.stackName.toLowerCase() === stack.name.toLowerCase()) ||
      c.names.some(n => n.toLowerCase().includes(stack.name.toLowerCase()))
    );

    // Parse compose volumes & mounts from compose file
    const namedMap = new Map<string, PortainerStackVolume>();
    const bindMap = new Map<string, PortainerStackVolume>();
    const imageList: PortainerStackImage[] = [];
    const serviceList: Array<{ name: string; image: string; status: string; ports: string[] }> = [];

    // Helper to categorize volume path
    const categorizeMount = (dest: string): PortainerStackVolume['category'] => {
      const lower = dest.toLowerCase();
      if (lower.includes('config')) return 'config';
      if (lower.includes('log')) return 'logs';
      if (lower.includes('backup')) return 'backups';
      if (lower.includes('cert')) return 'certs';
      if (lower.includes('media') || lower.includes('video') || lower.includes('anime') || lower.includes('series') || lower.includes('porn') || lower.includes('download')) return 'media';
      if (lower.includes('cache')) return 'cache';
      return 'data';
    };

    // 1. Extract mounts directly from live Docker containers for 100% accuracy
    for (const c of stackContainers) {
      if (c.mounts && Array.isArray(c.mounts)) {
        for (const m of c.mounts) {
          const isVolume = m.type === 'volume' || !m.source.startsWith('/') || m.driver === 'local';
          const volName = m.name || m.source;
          const volObj: PortainerStackVolume = {
            name: volName,
            containerPath: m.destination,
            isNamed: isVolume,
            category: categorizeMount(m.destination),
          };

          if (isVolume) {
            namedMap.set(volName, volObj);
          } else {
            bindMap.set(volName, volObj);
          }
        }
      }
    }

    // 2. Also parse compose file lines as supplement
    const lines = composeFile.split('\n');
    let inVolumes = false;

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('services:')) continue;

      const imgMatch = line.match(/^image:\s*([^\s]+)/);
      if (imgMatch) {
        const fullImg = imgMatch[1].replace(/['"]/g, '');
        let registry = 'docker.io';
        let repo = fullImg;
        let tag = 'latest';

        if (fullImg.includes(':')) {
          const parts = fullImg.split(':');
          repo = parts[0];
          tag = parts[1];
        }

        if (repo.startsWith('lscr.io/')) {
          registry = 'ghcr.io';
          repo = repo.replace('lscr.io/', '');
        } else if (repo.startsWith('ghcr.io/')) {
          registry = 'ghcr.io';
          repo = repo.replace('ghcr.io/', '');
        } else if (repo.startsWith('quay.io/')) {
          registry = 'quay.io';
          repo = repo.replace('quay.io/', '');
        } else if (repo.includes('/')) {
          registry = 'docker.io';
        }

        if (!imageList.some(im => im.name === fullImg)) {
          imageList.push({
            name: fullImg,
            repository: repo,
            tag,
            registryUrl: registry,
            status: 'up-to-date',
          });
        }
      }

      if (line === 'volumes:') {
        inVolumes = true;
        continue;
      }

      if (inVolumes && line.startsWith('- ')) {
        const volStr = line.replace(/^- /, '').replace(/['"]/g, '').trim();
        const parts = volStr.split(':');
        if (parts.length >= 2) {
          const src = parts[0];
          const dest = parts[1];
          const isBind = src.startsWith('/') || src.startsWith('.');

          const volObj: PortainerStackVolume = {
            name: src,
            containerPath: dest,
            isNamed: !isBind,
            category: categorizeMount(dest),
          };

          if (isBind) {
            if (!bindMap.has(src)) bindMap.set(src, volObj);
          } else {
            if (!namedMap.has(src)) namedMap.set(src, volObj);
          }
        }
      } else if (inVolumes && !line.startsWith('- ') && line.endsWith(':')) {
        inVolumes = false;
      }
    }

    // Populate service list from container inspection
    for (const c of stackContainers) {
      serviceList.push({
        name: c.primaryName,
        image: c.image,
        status: c.status,
        ports: c.ports.map(p => `${p.publicPort ? `${p.publicPort}:` : ''}${p.privatePort}/${p.type}`),
      });
    }

    // Get Docker host images to compare digests and creation timestamps
    const rawDockerImages = await this.request<any[]>(`/endpoints/${endpointId}/docker/images/json`).catch(() => []);

    // Enhance image updates checking against source hosting registries (Docker Hub, GHCR, Quay)
    for (const img of imageList) {
      await this.checkImageUpdate(img, rawDockerImages);
    }

    const namedVolumes = Array.from(namedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const hostMounts = Array.from(bindMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Get networks
    const rawNetworks = await this.request<any[]>(`/endpoints/${endpointId}/docker/networks`).catch(() => []);
    const filteredNetworks = (rawNetworks || [])
      .filter(net => net.Name === 'entertainment' || net.Name.includes(stack.name.toLowerCase()) || net.Name === 'bridge');

    // Get container IPs for each network (parallel requests)
    const networkDetailsPromises = filteredNetworks.map(net =>
      this.request<any>(`/endpoints/${endpointId}/docker/networks/${net.Id}`).catch(() => null)
    );
    const networkDetailsResults = await Promise.all(networkDetailsPromises);

    const stackNetworks: PortainerStackNetwork[] = filteredNetworks.map((net, idx) => {
      const networkDetails = networkDetailsResults[idx];
      const containerIps: string[] = [];
      if (networkDetails?.Containers) {
        for (const container of Object.values(networkDetails.Containers) as Array<{ IPv4Address?: string }>) {
          if (container.IPv4Address) {
            containerIps.push(container.IPv4Address.split('/')[0]);
          }
        }
      }

      return {
        name: net.Name,
        driver: net.Driver,
        scope: net.Scope,
        ipam: {
          ipv4Address: net.IPAM?.Config?.[0]?.Subnet,
          gateway: net.IPAM?.Config?.[0]?.Gateway,
        },
        aliases: [],
        containerIps,
      };
    });

    return {
      ...stack,
      composeFile,
      namedVolumes,
      hostMounts,
      volumesGrouped: {
        named: namedVolumes,
        binds: hostMounts,
      },
      networks: stackNetworks,
      images: imageList,
      containers: stackContainers,
      services: serviceList,
    };
  }

  /**
   * Helper method to inspect registry update for a single container image
   */
  async checkImageUpdate(img: PortainerStackImage, localDockerImages: any[] = []): Promise<PortainerStackImage> {
    const localMatch = localDockerImages.find(di => 
      (di.RepoTags && di.RepoTags.some((t: string) => t.includes(img.repository) || t.includes(img.name))) ||
      (di.RepoDigests && di.RepoDigests.some((d: string) => d.includes(img.repository) || d.includes(img.name)))
    );

    if (localMatch) {
      img.localCreated = localMatch.Created * 1000;
      if (localMatch.RepoDigests && localMatch.RepoDigests.length > 0) {
        const rawDig = localMatch.RepoDigests[0];
        img.localDigest = rawDig.includes('@') ? rawDig.split('@')[1] : rawDig;
      }
    }

    const registry = img.registryUrl || 'docker.io';
    const tag = img.tag || 'latest';

    try {
      if (registry === 'ghcr.io') {
        const tokenRes = await this.fetchImpl(`https://ghcr.io/token?scope=repository:${img.repository}:pull`);
        if (tokenRes.ok) {
          const tokenData: any = await tokenRes.json();
          const manifestRes = await this.fetchImpl(`https://ghcr.io/v2/${img.repository}/manifests/${tag}`, {
            headers: {
              Authorization: `Bearer ${tokenData.token}`,
              Accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json',
            },
          });
          if (manifestRes.ok) {
            const digest = manifestRes.headers.get('docker-content-digest') || manifestRes.headers.get('etag')?.replace(/"/g, '');
            if (digest) {
              img.remoteDigest = digest;
              if (img.localDigest) {
                img.status = img.localDigest === digest ? 'up-to-date' : 'update-available';
              }
            }
          }
        }
      } else if (registry === 'quay.io') {
        const quayRes = await this.fetchImpl(`https://quay.io/api/v1/repository/${img.repository}/tag/?specificTag=${tag}`);
        if (quayRes.ok) {
          const quayData: any = await quayRes.json();
          const tagInfo = quayData.tags?.[0];
          if (tagInfo) {
            img.remoteDigest = tagInfo.manifest_digest;
            if (tagInfo.last_modified) {
              img.remoteUpdated = new Date(tagInfo.last_modified).toISOString();
              if (img.localCreated && new Date(tagInfo.last_modified).getTime() > img.localCreated + 300000) {
                img.status = 'update-available';
              } else {
                img.status = 'up-to-date';
              }
            }
          }
        }
      } else {
        const repoPath = img.repository.includes('/') ? img.repository : `library/${img.repository}`;
        const hubRes = await this.fetchImpl(`https://hub.docker.com/v2/repositories/${repoPath}/tags/${tag}`);
        if (hubRes.ok) {
          const hubData: any = await hubRes.json();
          img.remoteUpdated = hubData.last_updated;
          img.remoteDigest = hubData.digest;

          if (img.localCreated && hubData.last_updated) {
            const remoteTime = new Date(hubData.last_updated).getTime();
            if (remoteTime > img.localCreated + 300000) {
              img.status = 'update-available';
            } else if (img.localDigest && hubData.digest && img.localDigest !== hubData.digest) {
              img.status = 'update-available';
            } else {
              img.status = 'up-to-date';
            }
          } else if (img.localDigest && hubData.digest) {
            img.status = img.localDigest === hubData.digest ? 'up-to-date' : 'update-available';
          } else {
            img.status = 'update-available';
          }
        } else {
          img.status = 'unknown';
        }
      }
    } catch {
      img.status = img.localCreated ? 'up-to-date' : 'unknown';
    }

    return img;
  }

  /**
   * Check image updates across all stacks or specific stacks in an environment
   */
  async checkFleetImageUpdates(endpointId: number = 2, stackIds?: number[]): Promise<Record<number, PortainerStackImageSummary>> {
    const stacks = await this.getStacks(endpointId);
    const targetStacks = stackIds ? stacks.filter(s => stackIds.includes(s.id)) : stacks;
    const rawDockerImages = await this.request<any[]>(`/endpoints/${endpointId}/docker/images/json`).catch(() => []);
    const results: Record<number, PortainerStackImageSummary> = {};

    for (const st of targetStacks) {
      try {
        const compose = await this.getStackFile(st.id);
        const images: PortainerStackImage[] = [];
        const lines = compose.split('\n');

        for (const rawLine of lines) {
          const line = rawLine.trim();
          const imgMatch = line.match(/^image:\s*([^\s]+)/);
          if (imgMatch) {
            const fullImg = imgMatch[1].replace(/['"]/g, '');
            let registry = 'docker.io';
            let repo = fullImg;
            let tag = 'latest';

            if (fullImg.includes(':')) {
              const parts = fullImg.split(':');
              repo = parts[0];
              tag = parts[1];
            }

            if (repo.startsWith('lscr.io/') || repo.startsWith('ghcr.io/')) {
              registry = 'ghcr.io';
              repo = repo.replace(/^(lscr\.io|ghcr\.io)\//, '');
            } else if (repo.startsWith('quay.io/')) {
              registry = 'quay.io';
              repo = repo.replace('quay.io/', '');
            } else if (repo.includes('/')) {
              registry = 'docker.io';
            }

            if (!images.some(im => im.name === fullImg)) {
              images.push({
                name: fullImg,
                repository: repo,
                tag,
                registryUrl: registry,
                status: 'checking',
              });
            }
          }
        }

        if (images.length > 0) {
          const primaryImage = images[0];
          await this.checkImageUpdate(primaryImage, rawDockerImages);

          const hasUpdate = images.some(im => im.status === 'update-available') || primaryImage.status === 'update-available';
          const updateVer = hasUpdate ? (primaryImage.tag !== 'latest' ? `${primaryImage.tag} (New Build)` : 'Newer Build Available') : undefined;

          results[st.id] = {
            currentVersion: primaryImage.tag || 'latest',
            updateVersion: updateVer,
            status: hasUpdate ? 'update-available' : 'up-to-date',
            imageName: primaryImage.name,
            lastChecked: Date.now(),
          };
        } else {
          results[st.id] = {
            status: 'unknown',
            lastChecked: Date.now(),
          };
        }
      } catch {
        results[st.id] = {
          status: 'unknown',
          lastChecked: Date.now(),
        };
      }
    }

    return results;
  }

  /**
   * Re-deploy stack with guaranteed image pull & container status verification
   */
  async redeployStack(stackId: number, endpointId: number): Promise<{ success: boolean; containersCount: number; status: string }> {
    const stack = (await this.getStacks(endpointId)).find(s => s.id === stackId);
    if (!stack) {
      throw new Error(`Stack ${stackId} does not exist in environment ${endpointId}`);
    }

    const content = await this.getStackFile(stackId);
    
    // Deploy update with prune
    await this.updateStack(stackId, endpointId, content, stack.env || []);

    // Wait & verify that containers are alive
    await new Promise(r => setTimeout(r, 2500));
    const containers = await this.getContainers(endpointId);
    const liveStackContainers = containers.filter(c => 
      (c.stackName && c.stackName.toLowerCase() === stack.name.toLowerCase()) ||
      c.names.some(n => n.toLowerCase().includes(stack.name.toLowerCase()))
    );

    const isRunning = liveStackContainers.some(c => c.state === 'running');
    return {
      success: isRunning || liveStackContainers.length > 0,
      containersCount: liveStackContainers.length,
      status: isRunning ? 'running' : 'starting',
    };
  }

  /**
   * Full update process: pull latest images, redeploy stack, remove old images
   * Returns progress updates via callback if provided
   */
  async updateStackFull(
    stackId: number, 
    endpointId: number, 
    onProgress?: (progress: { stage: string; progress: number; message: string }) => void
  ): Promise<{ 
    success: boolean; 
    containersCount: number; 
    status: string;
    imagesUpdated: number;
    oldImagesRemoved: number;
  }> {
    const stack = (await this.getStacks(endpointId)).find(s => s.id === stackId);
    if (!stack) {
      throw new Error(`Stack ${stackId} does not exist in environment ${endpointId}`);
    }

    let imagesUpdated = 0;
    let oldImagesRemoved = 0;

    const updateProgress = (stage: string, progress: number, message: string) => {
      if (onProgress) onProgress({ stage, progress, message });
    };

    try {
      // Stage 1: Check for image updates
      updateProgress('checking', 5, 'Checking for image updates...');
      const details = await this.getStackDetails(endpointId, stackId);
      const imagesToUpdate = details.images?.filter(img => img.status === 'update-available') || [];
      
      if (imagesToUpdate.length === 0) {
        return {
          success: true,
          containersCount: 0,
          status: 'up-to-date',
          imagesUpdated: 0,
          oldImagesRemoved: 0,
        };
      }

      updateProgress('pulling', 10, `Pulling ${imagesToUpdate.length} updated image(s)...`);
      
      // Pull latest images for each service that has updates
      for (const img of imagesToUpdate) {
        updateProgress('pulling', 15 + (imagesUpdated * 20), `Pulling ${img.name}:${img.tag}...`);
        try {
          await this.request(`/endpoints/${endpointId}/docker/images/create?fromImage=${encodeURIComponent(img.repository)}&tag=${img.tag}`, {
            method: 'POST',
          });
          imagesUpdated++;
        } catch (err) {
          console.warn(`Failed to pull ${img.name}:${img.tag}:`, err);
        }
      }

updateProgress('redeploying', 50, 'Redeploying stack with new images...');
       
       // Redeploy stack with new images
       await this.updateStack(stackId, endpointId, await this.getStackFile(stackId), stack.env || []);
      
      // Wait for containers to start
      await new Promise(r => setTimeout(r, 5000));
      
      updateProgress('verifying', 80, 'Verifying containers are running...');
      
      // Verify containers are running
      const containers = await this.getContainers(endpointId);
      const stacks = await this.getStacks(endpointId);
      const stackInfo = stacks.find(s => s.id === stackId);
      const stackName = stackInfo?.name?.toLowerCase();
      const liveStackContainers = containers.filter(c => 
        (c.stackName && stackName && c.stackName.toLowerCase() === stackName) ||
        c.names.some(n => n.toLowerCase().includes(stack.name.toLowerCase()))
      );

      const isRunning = liveStackContainers.some(c => c.state === 'running');
      
      // Stage 4: Remove old images
      updateProgress('cleaning', 90, 'Removing old unused images...');
      
      try {
        const pruneResult = await this.request<any>(`/endpoints/${endpointId}/docker/images/prune`, {
          method: 'POST',
          body: JSON.stringify({ filters: { dangling: ['true'] } }),
        });
        oldImagesRemoved = pruneResult.ImagesDeleted?.length || 0;
      } catch (err) {
        console.warn('Failed to prune old images:', err);
      }

      updateProgress('complete', 100, 'Update complete!');

      return {
        success: true,
        containersCount: liveStackContainers.length,
        status: 'running',
        imagesUpdated,
        oldImagesRemoved,
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * List live Docker containers in an environment
   */
  async getContainers(endpointId: number): Promise<PortainerContainer[]> {
    const raw = await this.request<any[]>(`/endpoints/${endpointId}/docker/containers/json?all=1`);
    
    return raw.map(c => {
      const names = (c.Names || []).map((n: string) => n.replace(/^\//, ''));
      const primaryName = names[0] || c.Id.slice(0, 12);
      
      let health: 'healthy' | 'unhealthy' | 'starting' | 'none' = 'none';
      if (c.Status?.includes('(healthy)')) health = 'healthy';
      else if (c.Status?.includes('(unhealthy)')) health = 'unhealthy';
      else if (c.Status?.includes('(health: starting)')) health = 'starting';

      return {
        id: c.Id,
        names,
        primaryName,
        image: c.Image,
        imageId: c.ImageID,
        command: c.Command,
        created: c.Created * 1000,
        state: c.State,
        status: c.Status,
        health,
        ports: (c.Ports || []).map((p: any) => ({
          ip: p.IP,
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort,
          type: p.Type,
        })),
        mounts: (c.Mounts || []).map((m: any) => ({
          type: m.Type === 'volume' ? 'volume' : 'bind',
          name: m.Name,
          source: m.Source,
          destination: m.Destination,
          driver: m.Driver,
          rw: m.RW,
        })),
        endpointId,
      };
    });
  }

  /**
   * Fetch live logs for a container
   */
  async getContainerLogs(endpointId: number, containerIdOrName: string, tail: number = 200): Promise<string> {
    let containerId = containerIdOrName;
    
    // If containerId is not a 64-char hex id, attempt to resolve from containers list
    if (!/^[a-f0-9]{12,64}$/i.test(containerId)) {
      try {
        const containers = await this.getContainers(endpointId);
        const match = containers.find(c => 
          c.names.some(n => n.toLowerCase() === containerIdOrName.toLowerCase() || n.toLowerCase().includes(containerIdOrName.toLowerCase())) ||
          c.primaryName.toLowerCase().includes(containerIdOrName.toLowerCase())
        );
        if (match) {
          containerId = match.id;
        }
      } catch {
        // Fall back to original identifier
      }
    }

    const url = `${this.baseUrl}/endpoints/${endpointId}/docker/containers/${containerId}/logs?stdout=1&stderr=1&tail=${tail}&timestamps=1`;
    const resp = await this.fetchImpl(url, {
      headers: { 'X-API-Key': this.apiKey },
    });
    
    if (!resp.ok) {
      throw new Error(`Failed to fetch logs: ${resp.statusText}`);
    }
    
    return await resp.text();
  }

  /**
   * Trigger container lifecycle action (start, stop, restart, kill)
   */
  async containerAction(endpointId: number, containerId: string, action: 'start' | 'stop' | 'restart' | 'kill'): Promise<void> {
    await this.request(`/endpoints/${endpointId}/docker/containers/${containerId}/${action}`, {
      method: 'POST',
    });
  }

  // ==========================================
  // 📋 CUSTOM STACK TEMPLATES (Rule 26)
  // ==========================================

  /**
   * List all Custom Templates saved in Portainer
   */
  async getCustomTemplates(): Promise<any[]> {
    return await this.request<any[]>('/custom_templates');
  }

  /**
   * Get single Custom Template by ID
   */
  async getCustomTemplate(id: number): Promise<any> {
    return await this.request<any>(`/custom_templates/${id}`);
  }

  /**
   * Get Compose file content of a Custom Template
   */
  async getCustomTemplateFile(id: number): Promise<string> {
    const res = await this.request<{ FileContent: string }>(`/custom_templates/${id}/file`);
    return res.FileContent || '';
  }

  /**
   * Create a new Custom Template
   */
  async createCustomTemplate(payload: {
    title: string;
    description: string;
    note?: string;
    platform?: number;
    type?: number; // 1: container, 2: swarm, 3: compose
    logo?: string;
    fileContent: string;
    variables?: Array<{ name: string; label: string; defaultValue?: string; description?: string }>;
  }): Promise<any> {
    return await this.request<any>('/custom_templates/create/string', {
      method: 'POST',
      body: JSON.stringify({
        Title: payload.title,
        Description: payload.description,
        Note: payload.note || '',
        Platform: payload.platform || 1,
        Type: payload.type || 3,
        Logo: payload.logo || '',
        FileContent: payload.fileContent,
        Variables: payload.variables || [],
      }),
    });
  }

  /**
   * Update an existing Custom Template
   */
  async updateCustomTemplate(id: number, payload: {
    title?: string;
    description?: string;
    note?: string;
    platform?: number;
    type?: number;
    logo?: string;
    fileContent?: string;
    variables?: Array<{ name: string; label: string; defaultValue?: string; description?: string }>;
  }): Promise<any> {
    return await this.request<any>(`/custom_templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        Title: payload.title,
        Description: payload.description,
        Note: payload.note,
        Platform: payload.platform || 1,
        Type: payload.type || 3,
        Logo: payload.logo,
        FileContent: payload.fileContent,
        Variables: payload.variables,
      }),
    });
  }

  /**
   * Delete a Custom Template
   */
  async deleteCustomTemplate(id: number): Promise<void> {
    await this.request(`/custom_templates/${id}`, {
      method: 'DELETE',
    });
  }
}



