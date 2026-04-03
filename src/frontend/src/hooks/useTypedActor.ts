import type { backendInterface } from "../backend.d";
/**
 * This file provides a typed actor hook that uses the backend.d.ts interface
 * instead of the auto-generated (empty) backend.ts interface.
 */
import { useActor as useActorBase } from "./useActor";

export function useTypedActor() {
  const { actor, isFetching } = useActorBase();
  return {
    actor: actor as unknown as backendInterface | null,
    isFetching,
  };
}
