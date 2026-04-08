import { useActor } from "@caffeineai/core-infrastructure";
import { type Backend, createActor } from "../backend";

/**
 * This hook provides a typed Backend actor instance connected to the canister.
 * It uses the generated createActor function from backend.ts via the core-infrastructure useActor.
 */
export function useTypedActor(): {
  actor: Backend | null;
  isFetching: boolean;
} {
  return useActor(createActor);
}
