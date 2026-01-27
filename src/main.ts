import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import MissionReportModal from './views/MissionReportModal.vue';
import NpcRollPopover from './views/NpcRollPopover.vue';
import { MODAL_MISSION_REPORT, MODAL_NPC_ROLL_POPOVER } from './constants';

const params = new URLSearchParams(window.location.search);
const modalParam = params.get('modal');

let RootComponent = App;
if (modalParam === MODAL_MISSION_REPORT) {
  RootComponent = MissionReportModal;
} else if (modalParam === MODAL_NPC_ROLL_POPOVER) {
  RootComponent = NpcRollPopover;
}

createApp(RootComponent).mount('#app');
