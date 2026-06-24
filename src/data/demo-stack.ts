import type { ResourceType } from "@/types";

export const DEMO_STACK: {
  type: ResourceType;
  name: string;
  url: string;
}[] = [
  {
    type: "github",
    name: "fastapi/fastapi",
    url: "https://github.com/fastapi/fastapi",
  },
  {
    type: "docs",
    name: "Redis Python Client",
    url: "https://redis.io/docs/latest/develop/clients/redis-py/",
  },
  {
    type: "docs",
    name: "Celery Documentation",
    url: "https://docs.celeryq.dev/en/stable/",
  },
];