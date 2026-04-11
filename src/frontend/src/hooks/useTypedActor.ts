import { useActor } from "@caffeineai/core-infrastructure";
import { type Backend, createActor } from "../backend";

/**
 * Returns the typed Backend actor connected to the canister.
 * No object-storage callbacks — files are stored directly in the canister
 * via uploadDocumentWithData and retrieved via getDocumentData.
 */
export function useTypedActor(): {
  actor: Backend | null;
  isFetching: boolean;
} {
  const { actor, isFetching } = useActor(createActor);
  return { actor, isFetching };
}
