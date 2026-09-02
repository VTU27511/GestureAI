import os
import psutil

def get_system_metrics():
    """Retrieve system CPU and RAM usage, and process-specific memory consumption."""
    try:
        # Get overall CPU percent (non-blocking)
        cpu = psutil.cpu_percent(interval=None)
        
        # Get system virtual memory
        vm = psutil.virtual_memory()
        ram_percent = vm.percent
        
        # Get memory footprint of the current FastAPI process in MB
        process = psutil.Process(os.getpid())
        ram_used_mb = process.memory_info().rss / (1024 * 1024)
        
        return {
            "cpu_percent": float(cpu),
            "ram_percent": float(ram_percent),
            "ram_used_mb": float(round(ram_used_mb, 2))
        }
    except Exception as e:
        print(f"Error fetching system metrics: {e}")
        return {
            "cpu_percent": 0.0,
            "ram_percent": 0.0,
            "ram_used_mb": 0.0
        }
