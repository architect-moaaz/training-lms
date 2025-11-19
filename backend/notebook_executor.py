import nbformat
from jupyter_client import KernelManager
import queue
import time
from threading import Lock


class NotebookExecutor:
    def __init__(self, timeout=60):
        self.timeout = timeout
        self.kernel_manager = None
        self.kernel_client = None
        self.lock = Lock()
        self._start_kernel()

    def _start_kernel(self):
        """Start a persistent Jupyter kernel"""
        try:
            self.kernel_manager = KernelManager(kernel_name='python3')
            self.kernel_manager.start_kernel()
            self.kernel_client = self.kernel_manager.client()
            self.kernel_client.start_channels()

            # Wait for kernel to be ready
            self.kernel_client.wait_for_ready(timeout=30)
        except Exception as e:
            print(f"Error starting kernel: {e}")
            raise

    def execute_cell(self, code):
        """Execute a single code cell and return the output"""
        # Use lock to prevent concurrent execution issues
        with self.lock:
            if not self.kernel_client or not self.kernel_client.is_alive():
                self._start_kernel()

            try:
                # Execute the code
                msg_id = self.kernel_client.execute(code, allow_stdin=False)

                outputs = []
                execution_done = False

                # Collect all output messages with proper timeout
                start_time = time.time()
                while not execution_done and (time.time() - start_time) < self.timeout:
                    try:
                        # Use shorter timeout for get_iopub_msg to check execution_done more frequently
                        msg = self.kernel_client.get_iopub_msg(timeout=1)

                        # Only process messages that belong to this execution
                        if msg['parent_header'].get('msg_id') != msg_id:
                            continue

                        msg_type = msg['msg_type']
                        content = msg['content']

                        if msg_type == 'stream':
                            outputs.append({
                                'type': 'stream',
                                'name': content['name'],
                                'text': content['text']
                            })
                        elif msg_type == 'execute_result':
                            outputs.append({
                                'type': 'execute_result',
                                'data': content['data'],
                                'execution_count': content.get('execution_count')
                            })
                        elif msg_type == 'display_data':
                            outputs.append({
                                'type': 'display_data',
                                'data': content['data']
                            })
                        elif msg_type == 'error':
                            outputs.append({
                                'type': 'error',
                                'ename': content['ename'],
                                'evalue': content['evalue'],
                                'traceback': content['traceback']
                            })
                        elif msg_type == 'status' and content['execution_state'] == 'idle':
                            # Execution finished
                            execution_done = True

                    except queue.Empty:
                        # Continue waiting for messages until timeout or execution is done
                        continue

                return {'success': True, 'outputs': outputs}

            except Exception as e:
                return {
                    'success': False,
                    'error': str(e),
                    'type': 'error'
                }

    def restart_kernel(self):
        """Restart the kernel to clear all state"""
        with self.lock:
            try:
                if self.kernel_client:
                    self.kernel_client.stop_channels()
                if self.kernel_manager:
                    self.kernel_manager.shutdown_kernel(now=True)
            except Exception as e:
                print(f"Error shutting down kernel: {e}")

            self._start_kernel()

    def __del__(self):
        """Cleanup when the executor is destroyed"""
        try:
            if self.kernel_client:
                self.kernel_client.stop_channels()
            if self.kernel_manager:
                self.kernel_manager.shutdown_kernel(now=True)
        except:
            pass
