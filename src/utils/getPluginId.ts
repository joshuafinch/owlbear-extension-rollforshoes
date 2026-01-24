import OBR from "@owlbear-rodeo/sdk";

export default function getPluginId(path: string): string {
    return `${OBR.room.id}/${path}`;
}
