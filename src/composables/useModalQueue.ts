import { ref } from 'vue';

type ModalTask = {
  id: string;
  opener: () => Promise<void>;
};

const modalQueue = ref<ModalTask[]>([]);
const activeModalId = ref<string | null>(null);
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing) return;
  if (activeModalId.value) return;
  if (modalQueue.value.length === 0) return;

  isProcessing = true;
  const nextTask = modalQueue.value.shift();
  if (!nextTask) {
    isProcessing = false;
    return;
  }

  activeModalId.value = nextTask.id;
  try {
    await nextTask.opener();
  } catch (error) {
    console.error('Failed to open modal', error);
    activeModalId.value = null;
  } finally {
    isProcessing = false;
  }
};

export const useModalQueue = () => {
  const enqueueModal = (task: ModalTask) => {
    modalQueue.value.push(task);
    void processQueue();
  };

  const releaseModal = (modalId: string) => {
    if (activeModalId.value === modalId) {
      activeModalId.value = null;
      void processQueue();
    }
  };

  return {
    enqueueModal,
    releaseModal,
  };
};
