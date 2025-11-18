import nbformat
from jupyter_client import KernelManager
import queue
import time


class NotebookExecutor:
    def __init__(self, timeout=600):
        self.timeout = timeout
        self.kernel_manager = None
        self.kernel_client = None
        self._start_kernel()

    def _start_kernel(self):
        """Start a persistent Jupyter kernel"""
        self.kernel_manager = KernelManager(kernel_name='python3')
        self.kernel_manager.start_kernel()
        self.kernel_client = self.kernel_manager.client()
        self.kernel_client.start_channels()

        # Wait for kernel to be ready
        try:
            self.kernel_client.wait_for_ready(timeout=30)
        except RuntimeError:
            pass

    def execute_cell(self, code):
        """Execute a single code cell and return the output"""
        if not self.kernel_client or not self.kernel_client.is_alive():
            self._start_kernel()

        try:
            # Execute the code
            msg_id = self.kernel_client.execute(code)

            outputs = []

            # Collect all output messages
            while True:
                try:
                    msg = self.kernel_client.get_iopub_msg(timeout=self.timeout)

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
                        break

                except queue.Empty:
                    break

            return {'success': True, 'outputs': outputs}

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'type': 'error'
            }

    def restart_kernel(self):
        """Restart the kernel to clear all state"""
        if self.kernel_client:
            self.kernel_client.stop_channels()
        if self.kernel_manager:
            self.kernel_manager.shutdown_kernel()
        self._start_kernel()

    def __del__(self):
        """Cleanup when the executor is destroyed"""
        try:
            if self.kernel_client:
                self.kernel_client.stop_channels()
            if self.kernel_manager:
                self.kernel_manager.shutdown_kernel()
        except:
            pass
