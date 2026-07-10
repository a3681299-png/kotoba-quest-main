import { getEncounterFragment, validateHypothesis } from "./encounter";
import { parseStrategySentence } from "./strategy";
import type {
  EncounterDefinition,
  ReadingLoopAction,
  ReadingLoopSession,
  StrategySentence,
} from "./types";

function sameSentence(
  left: StrategySentence,
  right: StrategySentence,
): boolean {
  return (
    left.parts.length === right.parts.length &&
    left.parts.every((part, index) => {
      const other = right.parts[index];
      return (
        other !== undefined &&
        part.kind === other.kind &&
        part.semanticId === other.semanticId
      );
    })
  );
}

export function createReadingLoopSession(
  encounterId: string,
): ReadingLoopSession {
  return {
    encounterId,
    phase: "observation",
    observedEvents: [],
    extractedFragmentIds: [],
    hypothesis: null,
    hypothesisAssessment: "untested",
    strategySentence: { parts: [] },
    syntaxState: "building",
    execution: {
      status: "incomplete",
      activeRunId: null,
      cancelledRunId: null,
      startedRunIds: [],
    },
    strategyAssessment: "unverified",
    lastBattle: null,
    attempts: 0,
  };
}

export function transitionReadingLoopSession(
  encounter: EncounterDefinition,
  state: ReadingLoopSession,
  action: ReadingLoopAction,
): ReadingLoopSession {
  if (state.encounterId !== encounter.id) {
    return state;
  }

  switch (action.type) {
    case "record_observation":
      if (state.phase !== "observation") {
        return state;
      }
      return {
        ...state,
        observedEvents: [...action.events],
      };

    case "advance_to_reading":
      if (state.phase !== "observation") {
        return state;
      }
      return {
        ...state,
        phase: "reading",
      };

    case "extract_fragment":
      if (
        state.phase !== "reading" ||
        getEncounterFragment(encounter, action.fragmentId) === null ||
        state.extractedFragmentIds.includes(action.fragmentId)
      ) {
        return state;
      }
      return {
        ...state,
        extractedFragmentIds: [
          ...state.extractedFragmentIds,
          action.fragmentId,
        ],
      };

    case "remove_fragment":
      if (state.phase !== "reading") {
        return state;
      }
      return {
        ...state,
        extractedFragmentIds: state.extractedFragmentIds.filter(
          (fragmentId) => fragmentId !== action.fragmentId,
        ),
        hypothesis: state.hypothesis?.evidenceFragmentIds.includes(
          action.fragmentId,
        )
          ? null
          : state.hypothesis,
        hypothesisAssessment: state.hypothesis?.evidenceFragmentIds.includes(
          action.fragmentId,
        )
          ? "untested"
          : state.hypothesisAssessment,
      };

    case "set_hypothesis": {
      if (state.phase !== "reading") {
        return state;
      }

      const usesExtractedEvidence = action.hypothesis.evidenceFragmentIds.every(
        (fragmentId) => state.extractedFragmentIds.includes(fragmentId),
      );
      if (
        action.hypothesis.evidenceFragmentIds.length === 0 ||
        !usesExtractedEvidence
      ) {
        return state;
      }

      return {
        ...state,
        hypothesis: {
          ...action.hypothesis,
          evidenceFragmentIds: [...action.hypothesis.evidenceFragmentIds],
        },
        hypothesisAssessment: "untested",
      };
    }

    case "advance_to_strategy":
      if (state.phase !== "reading" || state.hypothesis === null) {
        return state;
      }
      return {
        ...state,
        phase: "strategy",
      };

    case "set_strategy_sentence": {
      if (
        state.phase !== "strategy" ||
        state.execution.status === "running" ||
        sameSentence(state.strategySentence, action.sentence)
      ) {
        return state;
      }

      const analysis = parseStrategySentence(action.sentence);
      return {
        ...state,
        strategySentence: {
          parts: [...action.sentence.parts],
        },
        syntaxState: analysis.state,
        execution: {
          ...state.execution,
          status: analysis.state === "valid" ? "complete" : "incomplete",
          activeRunId: null,
        },
        strategyAssessment: "unverified",
      };
    }

    case "begin_execution": {
      if (
        state.phase !== "strategy" ||
        state.syntaxState !== "valid" ||
        state.execution.status !== "complete" ||
        action.runId.trim().length === 0 ||
        state.execution.startedRunIds.includes(action.runId)
      ) {
        return state;
      }

      return {
        ...state,
        execution: {
          ...state.execution,
          status: "running",
          activeRunId: action.runId,
          startedRunIds: [
            ...state.execution.startedRunIds,
            action.runId,
          ],
        },
      };
    }

    case "cancel_execution":
      if (
        state.phase !== "strategy" ||
        state.execution.status !== "running" ||
        state.execution.activeRunId !== action.runId
      ) {
        return state;
      }
      return {
        ...state,
        execution: {
          ...state.execution,
          status: "complete",
          activeRunId: null,
          cancelledRunId: action.runId,
        },
      };

    case "record_validation": {
      if (
        state.phase !== "strategy" ||
        state.execution.status !== "running" ||
        state.execution.activeRunId !== action.runId ||
        action.result.validation.executable === false
      ) {
        return state;
      }

      const hypothesisAssessment =
        state.hypothesis && action.result.validation.conditionMatched
          ? validateHypothesis(encounter, state.hypothesis).assessment
          : "untested";
      const strategyAssessment =
        action.result.validation.tacticalStatus === "success"
          ? "confirmed"
          : action.result.validation.tacticalStatus === "failure"
            ? "refuted"
            : "unverified";

      return {
        ...state,
        phase: "validation",
        hypothesisAssessment,
        strategyAssessment,
        execution: {
          ...state.execution,
          status: "complete",
          activeRunId: null,
        },
        lastBattle: action.result,
        attempts: state.attempts + 1,
      };
    }

    case "return_to_strategy":
      if (state.phase !== "validation") {
        return state;
      }
      return {
        ...state,
        phase: "strategy",
        execution: {
          ...state.execution,
          status: state.syntaxState === "valid" ? "complete" : "incomplete",
          activeRunId: null,
        },
      };
  }
}
