import './style.css'
import OBR from "@owlbear-rodeo/sdk";
import { setupCounter } from './counter.js'
import { setupContextMenu } from './contextMenu.js'
import { setupRollForShoesList } from './rollForShoesList.js'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Owlbear Extension: Roll for Shoes</h1>
    <ul id="roll-for-shoes-list"></ul>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`

OBR.onReady(() => {
  setupCounter(document.querySelector('#counter'))
  setupContextMenu()
  setupRollForShoesList(document.querySelector('#roll-for-shoes-list'))
})
