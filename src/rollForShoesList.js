import OBR from "@owlbear-rodeo/sdk";

import getPluginId from "./getPluginId.js";

export function setupRollForShoesList(element) {
	const renderList = (items) => {
		const rollForShoesItems = items.filter(item => {
			const metadata = item.metadata[getPluginId("metadata")];
			return metadata && metadata.rollForShoes !== undefined;
		});

		const sortedItems = rollForShoesItems.sort((a, b) => {
			const aValue = a.metadata[getPluginId("metadata")].rollForShoes;
			const bValue = b.metadata[getPluginId("metadata")].rollForShoes;
			return aValue - bValue;
		});

		const nodes = [];
		for (const item of sortedItems) {
			const metadata = item.metadata[getPluginId("metadata")];
			const node = document.createElement("li");
			node.innerHTML = `${item.name}: ${metadata.rollForShoes}`;
			nodes.push(node);
		}
		element.replaceChildren(...nodes);
	};
	OBR.scene.items.onChange(renderList);
}
