import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import MissionReportModal from './views/MissionReportModal.vue';

const params = new URLSearchParams(window.location.search);
const isMissionReportModal = params.get('modal') === 'mission-report';

const RootComponent = isMissionReportModal ? MissionReportModal : App;

createApp(RootComponent).mount('#app');
