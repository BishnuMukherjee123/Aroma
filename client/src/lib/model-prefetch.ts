type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
};

interface FetchRequestInit extends RequestInit {
  priority?: "high" | "low" | "auto";
}

class ModelPrefetchQueue {
  private queue: string[] = [];
  private prefetchedUrls = new Set<string>();
  private activeCount = 0;
  private maxTotalPrefetches = 10;
  private abortControllers = new Map<string, AbortController>();
  private cancelTimeouts = new Map<string, number>();

  add(url: string) {
    // 1. If there's a pending cancellation for this URL, cancel the cancellation (resume)
    const existingTimeout = this.cancelTimeouts.get(url);
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      this.cancelTimeouts.delete(url);
    }

    // 2. If already prefetched or in queue, don't add again
    if (this.prefetchedUrls.has(url) || this.queue.includes(url)) {
      // Move to back of prefetchedUrls to refresh its LRU position
      if (this.prefetchedUrls.has(url)) {
        this.prefetchedUrls.delete(url);
        this.prefetchedUrls.add(url);
      }
      return;
    }

    // 3. Do not prefetch if the user is on a poor network or has data saver enabled
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const conn = (navigator as any).connection as NetworkInformation;
      if (
        conn.saveData === true ||
        conn.effectiveType === "2g" ||
        conn.effectiveType === "slow-2g"
      ) {
        return;
      }
    }

    // Prioritize nearest items using LIFO (unshift to front of queue)
    this.queue.unshift(url);
    this.process();
  }

  cancel(url: string) {
    // 1. If it's still waiting in the queue, just remove it immediately
    const index = this.queue.indexOf(url);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }

    // 2. If it's currently fetching, schedule a delayed abort
    const controller = this.abortControllers.get(url);
    if (controller && typeof window !== "undefined" && !this.cancelTimeouts.has(url)) {
      const timeoutId = window.setTimeout(() => {
        controller.abort();
        this.abortControllers.delete(url);
        this.prefetchedUrls.delete(url);
        this.cancelTimeouts.delete(url);
      }, 200);
      
      this.cancelTimeouts.set(url, timeoutId);
    }
  }

  private enforceMemoryCap() {
    // JS Sets maintain insertion order, making them perfect for an LRU cache sliding window
    while (this.prefetchedUrls.size >= this.maxTotalPrefetches) {
      const oldestUrl = this.prefetchedUrls.keys().next().value;
      if (oldestUrl !== undefined) {
        this.prefetchedUrls.delete(oldestUrl);
      } else {
        break;
      }
    }
  }

  private async process() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Adaptive concurrency using hardware capabilities instead of screen width
    const cores = navigator.hardwareConcurrency || 4;
    const maxConcurrent = cores <= 4 ? 1 : 2;

    if (this.activeCount >= maxConcurrent || this.queue.length === 0) {
      return;
    }

    const url = this.queue.shift()!;
    this.activeCount++;
    
    // Enforce sliding window before adding the new URL
    this.enforceMemoryCap();
    this.prefetchedUrls.add(url);

    const controller = new AbortController();
    this.abortControllers.set(url, controller);

    try {
      await fetch(url, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
        priority: "low",
        signal: controller.signal,
      } as FetchRequestInit);
    } catch (err: unknown) {
      // Quietly ignore AbortError
      if (err instanceof Error && err.name !== "AbortError") {
        console.warn("Prefetch failed for", url, err);
      }
    } finally {
      this.abortControllers.delete(url);
      this.activeCount--;
      this.process(); // Process the next item in the queue
    }
  }
}

export const modelPrefetchQueue = new ModelPrefetchQueue();
