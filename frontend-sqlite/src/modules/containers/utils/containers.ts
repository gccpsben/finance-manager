import type { ContainerDTO } from "@/../../api-types/container"

export function getContainerNameById(id: string, containers: ContainerDTO[])
{
    return containers.find(con => con.id == id)?.name;
}