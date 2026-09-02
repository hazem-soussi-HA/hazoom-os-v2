"""
HAZOOM OS — System Monitor
===========================
Real-time resource monitoring: CPU, memory, disk, network,
service health, with alerting thresholds.

Equivalent to: top, htop, vmstat, iostat, sar
"""

import time, threading, os, json
from pathlib import Path


class SystemMonitor:
    """
    Monitors system resources and service health.
    
    Usage:
        mon = SystemMonitor(check_interval=5)
        mon.set_alert("cpu", ">", 90, callback=alert_handler)
        mon.set_alert("memory", ">", 85, callback=alert_handler)
        mon.start()
        
        # Get current stats
        stats = mon.snapshot()
        
        # Get history
        history = mon.history(minutes=5)
    """

    def __init__(self, check_interval=5, history_minutes=60):
        self.check_interval = check_interval
        self.history_minutes = history_minutes
        self._history = []  # list of snapshots
        self._max_history = (history_minutes * 60) // check_interval
        self._alerts = []  # list of alert rules
        self._running = False
        self._thread = None
        self._lock = threading.Lock()
        self._boot_time = time.time()

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _monitor_loop(self):
        while self._running:
            snap = self.snapshot()
            with self._lock:
                self._history.append(snap)
                if len(self._history) > self._max_history:
                    self._history = self._history[-self._max_history:]
            self._check_alerts(snap)
            time.sleep(self.check_interval)

    def snapshot(self):
        """Take a snapshot of current system state."""
        snap = {
            "ts": time.time(),
            "uptime": time.time() - self._boot_time,
            "cpu": self._cpu_stats(),
            "memory": self._memory_stats(),
            "disk": self._disk_stats(),
            "network": self._network_stats(),
            "processes": self._process_stats(),
        }
        return snap

    def _cpu_stats(self):
        """Read /proc/stat for CPU usage."""
        try:
            with open("/proc/stat") as f:
                line = f.readline()
            fields = line.split()[1:]
            total = sum(int(f) for f in fields)
            idle = int(fields[3])
            return {
                "usage_pct": round((1 - idle / total) * 100, 1) if total > 0 else 0,
                "cores": os.cpu_count(),
            }
        except Exception:
            return {"usage_pct": 0, "cores": os.cpu_count()}

    def _memory_stats(self):
        """Read /proc/meminfo for memory usage."""
        try:
            mem = {}
            with open("/proc/meminfo") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) >= 2:
                        mem[parts[0].rstrip(":")] = int(parts[1])
            total = mem.get("MemTotal", 0)
            available = mem.get("MemAvailable", 0)
            used = total - available
            return {
                "total_kb": total,
                "used_kb": used,
                "available_kb": available,
                "usage_pct": round(used / total * 100, 1) if total > 0 else 0,
                "swap_total_kb": mem.get("SwapTotal", 0),
                "swap_free_kb": mem.get("SwapFree", 0),
            }
        except Exception:
            return {"usage_pct": 0}

    def _disk_stats(self):
        """Get disk usage for key mount points."""
        stats = {}
        for path in ["/", "/root", "/tmp"]:
            try:
                st = os.statvfs(path)
                total = st.f_blocks * st.f_frsize
                free = st.f_bavail * st.f_frsize
                used = total - free
                stats[path] = {
                    "total_gb": round(total / (1024 ** 3), 2),
                    "used_gb": round(used / (1024 ** 3), 2),
                    "free_gb": round(free / (1024 ** 3), 2),
                    "usage_pct": round(used / total * 100, 1) if total > 0 else 0,
                }
            except Exception:
                pass
        return stats

    def _network_stats(self):
        """Read /proc/net/dev for network I/O."""
        try:
            stats = {}
            with open("/proc/net/dev") as f:
                for line in f:
                    if ":" not in line:
                        continue
                    iface, data = line.split(":", 1)
                    iface = iface.strip()
                    if iface == "lo":
                        continue
                    fields = data.split()
                    stats[iface] = {
                        "rx_bytes": int(fields[0]),
                        "tx_bytes": int(fields[8]),
                        "rx_packets": int(fields[1]),
                        "tx_packets": int(fields[9]),
                    }
            return stats
        except Exception:
            return {}

    def _process_stats(self):
        """Count running processes."""
        try:
            return {"count": len([d for d in os.listdir("/proc") if d.isdigit()])}
        except Exception:
            return {"count": 0}

    def set_alert(self, resource, op, threshold, callback=None, cooldown=300):
        """
        Set an alert threshold.
        
        Args:
            resource: "cpu", "memory", "disk:/", etc.
            op: ">", "<", "=="
            threshold: numeric value
            callback: fn(alert_dict) called when threshold breached
            cooldown: seconds between repeated alerts
        """
        self._alerts.append({
            "id": f"{resource}:{op}:{threshold}",
            "resource": resource,
            "op": op,
            "threshold": threshold,
            "callback": callback,
            "cooldown": cooldown,
            "last_fired": 0,
        })

    def _check_alerts(self, snapshot):
        """Check all alert rules against current snapshot."""
        for alert in self._alerts:
            value = self._get_resource_value(alert["resource"], snapshot)
            if value is None:
                continue

            triggered = False
            if alert["op"] == ">" and value > alert["threshold"]:
                triggered = True
            elif alert["op"] == "<" and value < alert["threshold"]:
                triggered = True
            elif alert["op"] == "==" and value == alert["threshold"]:
                triggered = True

            if triggered:
                now = time.time()
                if now - alert["last_fired"] > alert["cooldown"]:
                    alert["last_fired"] = now
                    event = {
                        "alert_id": alert["id"],
                        "resource": alert["resource"],
                        "value": value,
                        "threshold": alert["threshold"],
                        "ts": now,
                    }
                    if alert["callback"]:
                        try:
                            alert["callback"](event)
                        except Exception:
                            pass

    def _get_resource_value(self, resource, snapshot):
        """Extract a resource value from a snapshot."""
        if resource == "cpu":
            return snapshot.get("cpu", {}).get("usage_pct")
        if resource == "memory":
            return snapshot.get("memory", {}).get("usage_pct")
        if resource.startswith("disk:"):
            path = resource[5:]
            return snapshot.get("disk", {}).get(path, {}).get("usage_pct")
        return None

    def history(self, minutes=5):
        """Get recent history."""
        cutoff = time.time() - minutes * 60
        with self._lock:
            return [s for s in self._history if s["ts"] >= cutoff]

    def current(self):
        """Get latest snapshot."""
        with self._lock:
            return self._history[-1] if self._history else self.snapshot()

    def stats_summary(self):
        """Get summary statistics."""
        with self._lock:
            if not self._history:
                return {}
            cpu_values = [s["cpu"]["usage_pct"] for s in self._history
                          if "cpu" in s]
            mem_values = [s["memory"]["usage_pct"] for s in self._history
                          if "memory" in s]
        return {
            "samples": len(self._history),
            "cpu_avg": sum(cpu_values) / len(cpu_values) if cpu_values else 0,
            "cpu_max": max(cpu_values) if cpu_values else 0,
            "mem_avg": sum(mem_values) / len(mem_values) if mem_values else 0,
            "mem_max": max(mem_values) if mem_values else 0,
            "alerts_configured": len(self._alerts),
        }
