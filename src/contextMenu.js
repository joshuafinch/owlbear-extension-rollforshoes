import OBR from "@owlbear-rodeo/sdk";

import getPluginId from "./getPluginId.js";

export function setupContextMenu() {
	OBR.contextMenu.create({
		id: getPluginId("context-menu"),
		icons: [
			{
				icon: "/add.svg",
				label: "Add to Roll for Shoes",
				filter: {
					every: [
						{ key: "layer", value: "CHARACTER" },
						{ key: ["metadata", getPluginId("metadata")], value: undefined },
					],
				},
			},
			{
				icon: "/remove.svg",
				label: "Remove from Roll for Shoes",
				filter: {
					every: [
						{ key: "layer", value: "CHARACTER" }
					],
				},
			}
		],
		onClick(context) {

			const addToRollForShoes = context.items.every(item => {
				const metadata = item.metadata[getPluginId("metadata")];
				return !metadata || metadata.rollForShoes === undefined;
			});

			if (addToRollForShoes) {
				const rollForShoes = window.prompt("Enter the Roll for Shoes value");
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						item.metadata[getPluginId("metadata")] = {
							rollForShoes,
						};
					}
				});
			} else {
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						if (item.metadata[getPluginId("metadata")]) {
							delete item.metadata[getPluginId("metadata")];
						}
					}
				});
			}
		},
	});
}