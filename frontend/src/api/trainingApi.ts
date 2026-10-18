import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from './apiClient.ts'

function buildQuery(
  params: Record<
    string,
    string | number | boolean | null | undefined
  >,
) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return
      }

      query.set(
        key,
        typeof value === 'boolean'
          ? value
            ? '1'
            : '0'
          : String(value),
      )
    },
  )

  const result = query.toString()

  return result ? `?${result}` : ''
}

export type TrainingIntensity =
  | 'Low'
  | 'Moderate'
  | 'High'
  | 'Very High'

export type FitnessLevel =
  | 'Excellent'
  | 'Good'
  | 'Average'
  | 'Needs Monitoring'

export type ExperienceLevel =
  | 'Junior'
  | 'Intermediate'
  | 'Senior'
  | 'Expert'

/* =========================================================
 * SPECIALIZATION / TRAINER
 * ======================================================= */

export interface Specialization {
  SpecializationID: number
  SpecializationCode: string
  SpecializationName: string
  Description: string | null
  Status: 'Active' | 'Inactive'
}

export interface TrainerSpecialization {
  SpecializationID: number
  SpecializationName: string
}

export interface TrainerCredential {
  CredentialID: number
  TrainerID: number

  CredentialType:
    | 'Degree'
    | 'Certificate'
    | 'License'
    | 'Award'

  Title: string
  IssuedBy: string | null
  IssuedDate: string
  ExpiryDate: string | null
  FileUrl: string | null
  Note: string | null

  CreatedBy: number
  CreatedByName: string
  CreatedAt: string
}

export interface TrainerRaceResult {
  RaceResultID: number
  TrainerID: number

  HorseID: number | null
  HorseName: string

  RaceDate: string
  RaceName: string

  RaceClass:
    | 'Group 1'
    | 'Group 2'
    | 'Group 3'
    | 'Listed'
    | 'Handicap'
    | 'Maiden'
    | 'Other'

  FinishPosition: number
  FieldSize: number

  Note: string | null

  CreatedBy: number
  CreatedAt: string
}

export interface TrainerSummary {
  UserID: number
  FullName: string
  Email: string
  Phone: string | null

  Specializations: TrainerSpecialization[]

  CareerStartDate: string | null

  YearsOfExperience: number

  ExperienceLevel: ExperienceLevel

  ExperienceLevelName: string

  Seniority: number | null

  SenioritySince: string | null

  QualificationCount: number

  AwardCount: number

  CareerStarts: number
  CareerWins: number
  CareerWinRate: number | null

  RecentStarts: number
  RecentWins: number

  WinRate: number | null
  PlaceRate: number | null

  WinRateNote: string | null

  TrainerRating: number | null

  ActiveHorseCount: number

  HasProfile: boolean

  IsSuggested?: boolean

  MatchesSpecialization?: boolean

  MatchesLevel?: boolean

  RequiredLevel?:
    | ExperienceLevel
    | null

  SuggestionReason?: string
}

export interface TrainerDetail
  extends TrainerSummary {
  ActiveHorses: Array<{
    TrainerHorseAssignmentID: number
    HorseID: number
    HorseName: string
    HorseCode: string | null
    SpecializationName: string
    StartDate: string
  }>

  Credentials: TrainerCredential[]

  RecentRaceResults: TrainerRaceResult[]
}

export function getSpecializations() {
  return apiGet<Specialization[]>(
    '/specializations',
  )
}

export function getTrainers(
  params: {
    SpecializationID?: number
    HorseID?: number | string
  } = {},
) {
  return apiGet<TrainerSummary[]>(
    `/trainers${buildQuery(params)}`,
  )
}

export function getTrainer(
  trainerId: number | string,
) {
  return apiGet<TrainerDetail>(
    `/trainers/${trainerId}`,
  )
}

/* =========================================================
 * HORSE ASSESSMENT
 * ======================================================= */

export interface HorseAssessment {
  AssessmentID: number

  HorseID: number

  HeadTrainerID: number

  HeadTrainerName: string

  SpecializationID: number

  SpecializationName: string

  AssessmentDate: string

  QualityScore: number | null

  FitnessLevel:
    | FitnessLevel
    | null

  AssessmentNote: string | null

  DecisionStatus:
    | 'Recommended'
    | 'Rejected'
    | 'Superseded'
}

export interface HorseAssessmentInput {
  SpecializationID: number

  QualityScore?:
    | number
    | null

  FitnessLevel?:
    | FitnessLevel
    | null

  AssessmentNote?:
    | string
    | null

  DecisionStatus?:
    | 'Recommended'
    | 'Rejected'
}

export function getHorseAssessments(
  horseId: number | string,
) {
  return apiGet<HorseAssessment[]>(
    `/horses/${horseId}/assessments`,
  )
}

export function createHorseAssessment(
  horseId: number | string,
  payload: HorseAssessmentInput,
) {
  return apiPost<HorseAssessment>(
    `/horses/${horseId}/assessments`,
    payload,
  )
}

/* =========================================================
 * TRAINER ASSIGNMENT
 * ======================================================= */

export interface TrainerAssignment {
  TrainerHorseAssignmentID: number

  HorseID: number
  HorseName: string

  TrainerID: number
  TrainerName: string

  SpecializationID: number
  SpecializationName: string

  AssignedByHeadTrainerID: number
  AssignedByName: string

  AssessmentID: number | null

  StartDate: string

  EndDate: string | null

  Status:
    | 'Active'
    | 'Ended'

  AssignmentNote: string | null

  TrainerExperienceLevel?:
    | ExperienceLevel

  RequiredLevel?:
    | ExperienceLevel
    | null

  LevelWarning?: string | null
}

export function getTrainerAssignments(
  params: {
    HorseID?: number | string
    TrainerID?: number | string
    Status?: string
    mine?: boolean
  } = {},
) {
  return apiGet<TrainerAssignment[]>(
    `/trainer-assignments${buildQuery(
      params,
    )}`,
  )
}

export function assignTrainer(
  payload: {
    HorseID: number

    TrainerID: number

    SpecializationID: number

    AssessmentID?:
      | number
      | null

    StartDate?:
      | string
      | null

    AssignmentNote?:
      | string
      | null
  },
) {
  return apiPost<TrainerAssignment>(
    '/trainer-assignments',
    payload,
  )
}

export function endTrainerAssignment(
  id: number,
  reason?: string,
) {
  return apiPost<TrainerAssignment>(
    `/trainer-assignments/${id}/end`,
    {
      Reason:
        reason || undefined,
    },
  )
}

/* =========================================================
 * WORK RIDER PREFERENCE
 * ======================================================= */

export interface WorkRiderPreference {
  PreferenceID: number

  HorseID: number

  WorkRiderID: number

  WorkRiderName: string

  AssignedByHeadTrainerID: number

  StartDate: string

  EndDate: string | null

  Priority: number

  IsPreferred: boolean

  Note: string | null
}

export function getWorkRiderPreferences(
  horseId: number | string,
  all = false,
) {
  return apiGet<
    WorkRiderPreference[]
  >(
    `/horses/${horseId}/work-rider-preferences${buildQuery(
      { all },
    )}`,
  )
}

export function addWorkRiderPreference(
  horseId: number | string,
  payload: {
    WorkRiderID: number
    Priority?: number
    StartDate?: string | null
    Note?: string | null
  },
) {
  return apiPost<WorkRiderPreference>(
    `/horses/${horseId}/work-rider-preferences`,
    payload,
  )
}

export function endWorkRiderPreference(
  preferenceId: number,
) {
  return apiPost<WorkRiderPreference>(
    `/work-rider-preferences/${preferenceId}/end`,
    {},
  )
}

/* =========================================================
 * TRAINING PLAN
 * ======================================================= */

export interface TrainingPlanStage {
  TrainingPlanStageID: number

  TrainingPlanID: number

  StageName: string

  StageOrder: number

  Goal: string | null

  StartDate: string

  EndDate: string | null

  Intensity:
    | TrainingIntensity
    | null

  TrainingLoad: number | null

  DistanceTargetKm: number | null

  Surface: string | null

  Note: string | null
}

export interface TrainingPlan {
  TrainingPlanID: number

  TrainerHorseAssignmentID: number

  HorseID: number
  HorseName: string

  TrainerID: number
  TrainerName: string

  Goal: string | null

  StartDate: string

  EndDate: string | null

  OverallIntensity:
    | TrainingIntensity
    | null

  Note: string | null

  Status:
    | 'Draft'
    | 'Pending Approval'
    | 'Active'
    | 'Completed'
    | 'Cancelled'

  CreatedAt: string

  SubmittedAt: string | null

  ApprovedByHeadTrainerID:
    | number
    | null

  ApprovedAt: string | null

  ReviewNote: string | null

  Stages: TrainingPlanStage[]
}

export interface TrainingStageInput {
  StageName: string

  StageOrder?:
    | number
    | null

  Goal?:
    | string
    | null

  StartDate: string

  EndDate?:
    | string
    | null

  Intensity?:
    | TrainingIntensity
    | null

  TrainingLoad?:
    | number
    | null

  DistanceTargetKm?:
    | number
    | null

  Surface?:
    | string
    | null

  Note?:
    | string
    | null
}

export function getTrainingPlans(
  params: {
    HorseID?: number | string
    TrainerID?: number | string
    Status?: string
    mine?: boolean
  } = {},
) {
  return apiGet<TrainingPlan[]>(
    `/training-plans${buildQuery(
      params,
    )}`,
  )
}

export function getTrainingPlan(
  planId: number | string,
) {
  return apiGet<TrainingPlan>(
    `/training-plans/${planId}`,
  )
}

export function createTrainingPlan(
  payload: {
    HorseID: number

    Goal?:
      | string
      | null

    StartDate: string

    EndDate?:
      | string
      | null

    OverallIntensity?:
      | TrainingIntensity
      | null

    Note?:
      | string
      | null

    Stages?: TrainingStageInput[]
  },
) {
  return apiPost<TrainingPlan>(
    '/training-plans',
    payload,
  )
}

export function updateTrainingPlan(
  planId: number,
  payload: {
    Goal?: string | null

    StartDate?: string

    EndDate?: string | null

    OverallIntensity?:
      | TrainingIntensity
      | null

    Note?: string | null
  },
) {
  return apiPatch<TrainingPlan>(
    `/training-plans/${planId}`,
    payload,
  )
}

export function addTrainingPlanStage(
  planId: number,
  payload: TrainingStageInput,
) {
  return apiPost<TrainingPlanStage>(
    `/training-plans/${planId}/stages`,
    payload,
  )
}

export function updateTrainingPlanStage(
  stageId: number,
  payload: Partial<TrainingStageInput>,
) {
  return apiPatch<TrainingPlanStage>(
    `/training-plan-stages/${stageId}`,
    payload,
  )
}

export function deleteTrainingPlanStage(
  stageId: number,
) {
  return apiDelete<void>(
    `/training-plan-stages/${stageId}`,
  )
}

export function submitTrainingPlan(
  planId: number,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/submit`,
    {},
  )
}

export function approveTrainingPlan(
  planId: number,
  reviewNote?: string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/approve`,
    {
      ReviewNote:
        reviewNote || undefined,
    },
  )
}

export function returnTrainingPlan(
  planId: number,
  reviewNote: string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/return`,
    {
      ReviewNote: reviewNote,
    },
  )
}

export function completeTrainingPlan(
  planId: number,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/complete`,
    {},
  )
}

export function cancelTrainingPlan(
  planId: number,
  reason?: string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/cancel`,
    {
      Reason:
        reason || undefined,
    },
  )
}

export function reviseTrainingPlan(
  planId: number,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/revise`,
    {},
  )
}

/* =========================================================
 * SESSION / RESULT / REVIEW
 * ======================================================= */

export interface TrainingResult {
  TrainingResultID: number

  TrainingSessionID: number

  ActualDurationMinutes:
    | number
    | null

  ActualDistanceKm:
    | number
    | null

  AvgSpeedKmh:
    | number
    | null

  MaxSpeedKmh:
    | number
    | null

  AvgHeartRate:
    | number
    | null

  MaxHeartRate:
    | number
    | null

  RecoveryMinutes:
    | number
    | null

  PerformanceScore:
    | number
    | null

  RiderObservation:
    | string
    | null

  VideoUrl:
    | string
    | null

  SubstituteObservation:
    | string
    | null

  RecordedAt: string
}

export interface TrainingReview {
  TrainingReviewID: number

  TrainingSessionID: number

  HorseID: number
  HorseName: string

  SessionDate: string

  TrainerID: number
  TrainerName: string

  ReviewDate: string

  Evaluation:
    | 'Excellent'
    | 'Good'
    | 'Average'
    | 'Needs Improvement'

  TrainerComment:
    | string
    | null

  AdjustmentRequired: boolean

  AdjustmentNote:
    | string
    | null
}

export interface TrainingSession {
  TrainingSessionID: number

  TrainingPlanStageID: number

  TrainingPlanID: number

  StageName: string

  HorseID: number

  HorseName: string

  HorseCode: string | null

  WorkRiderID: number

  WorkRiderName: string

  AssignedByHeadTrainerID: number

  SubstituteTrainerID:
    | number
    | null

  AssignedTrainerID: number

  AssignedTrainerName: string

  SupervisingTrainerID: number

  SupervisingTrainerName: string

  IsSubstitute: boolean

  SessionDate: string

  StartTime: string

  EndTime: string | null

  SequenceNo: number

  TrainingType: string

  DurationPlannedMinutes:
    | number
    | null

  DistancePlannedKm:
    | number
    | null

  TargetSpeedKmh:
    | number
    | null

  TrainingLoad:
    | number
    | null

  Surface:
    | string
    | null

  Location:
    | string
    | null

  Instructions:
    | string
    | null

  Status:
    | 'Assigned'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled'
    | 'Missed'

  Result:
    | TrainingResult
    | null

  Review:
    | TrainingReview
    | null
}

export interface TrainingSessionInput {
  TrainingPlanStageID: number

  WorkRiderID: number

  SubstituteTrainerID?:
    | number
    | null

  SessionDate: string

  StartTime: string

  EndTime?:
    | string
    | null

  SequenceNo?:
    | number
    | null

  TrainingType: string

  DurationPlannedMinutes?:
    | number
    | null

  DistancePlannedKm?:
    | number
    | null

  TargetSpeedKmh?:
    | number
    | null

  TrainingLoad?:
    | number
    | null

  Surface?:
    | string
    | null

  Location?:
    | string
    | null

  Instructions?:
    | string
    | null
}

export function getTrainingSessions(
  params: {
    Date?: string
    From?: string
    To?: string

    HorseID?:
      | number
      | string

    TrainingPlanID?:
      | number
      | string

    WorkRiderID?:
      | number
      | string

    Status?: string

    mine?: boolean
  } = {},
) {
  return apiGet<
    TrainingSession[]
  >(
    `/training-sessions${buildQuery(
      params,
    )}`,
  )
}

export function getTrainingSession(
  sessionId: number | string,
) {
  return apiGet<TrainingSession>(
    `/training-sessions/${sessionId}`,
  )
}

export function createTrainingSession(
  payload: TrainingSessionInput,
) {
  return apiPost<TrainingSession>(
    '/training-sessions',
    payload,
  )
}

export function updateTrainingSession(
  sessionId: number,
  payload: Partial<TrainingSessionInput>,
) {
  return apiPatch<TrainingSession>(
    `/training-sessions/${sessionId}`,
    payload,
  )
}

export function startTrainingSession(
  sessionId: number,
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/start`,
    {},
  )
}

export function submitTrainingResult(
  sessionId: number,
  payload: {
    ActualDurationMinutes?:
      | number
      | null

    ActualDistanceKm?:
      | number
      | null

    AvgSpeedKmh?:
      | number
      | null

    MaxSpeedKmh?:
      | number
      | null

    AvgHeartRate?:
      | number
      | null

    MaxHeartRate?:
      | number
      | null

    RecoveryMinutes?:
      | number
      | null

    PerformanceScore?:
      | number
      | null

    RiderObservation?:
      | string
      | null

    VideoUrl?:
      | string
      | null
  },
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/result`,
    payload,
  )
}

export function submitSubstituteObservation(
  sessionId: number,
  observation: string,
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/substitute-observation`,
    {
      SubstituteObservation:
        observation,
    },
  )
}

export function stopTrainingSession(
  sessionId: number,
  payload: {
    Reason: string

    ReportHealth?: boolean

    Severity?:
      | 'Urgent'
      | 'Normal'

    Description?: string
  },
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/stop`,
    payload,
  )
}

export function cancelTrainingSession(
  sessionId: number,
  reason?: string,
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/cancel`,
    {
      Reason:
        reason || undefined,
    },
  )
}

export function markTrainingSessionMissed(
  sessionId: number,
  reason?: string,
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/missed`,
    {
      Reason:
        reason || undefined,
    },
  )
}

export function reviewTrainingSession(
  sessionId: number,
  payload: {
    Evaluation:
      | 'Excellent'
      | 'Good'
      | 'Average'
      | 'Needs Improvement'

    TrainerComment?:
      | string
      | null

    AdjustmentRequired?: boolean

    AdjustmentNote?:
      | string
      | null
  },
) {
  return apiPost<TrainingReview>(
    `/training-sessions/${sessionId}/review`,
    payload,
  )
}

export function getTrainingReviews(
  params: {
    AdjustmentRequired?: boolean

    HorseID?:
      | number
      | string

    Days?: number
  } = {},
) {
  return apiGet<TrainingReview[]>(
    `/training-reviews${buildQuery(
      params,
    )}`,
  )
}

/* =========================================================
 * DASHBOARD
 * ======================================================= */

export interface TrainingDashboardItem {
  HorseID: number

  HorseCode: string | null

  HorseName: string

  Gender: string | null

  SexClass: string | null

  CurrentHealthStatus:
    | string
    | null

  TrainerHorseAssignmentID:
    | number
    | null

  TrainerID:
    | number
    | null

  TrainerName:
    | string
    | null

  SpecializationName:
    | string
    | null

  ActiveTrainingPlanID:
    | number
    | null

  LatestTrainingDate:
    | string
    | null

  LatestPerformanceScore:
    | number
    | null

  LatestActualDistanceKm:
    | number
    | null

  LatestAvgSpeedKmh:
    | number
    | null

  LatestAvgHeartRate:
    | number
    | null

  LatestRecoveryMinutes:
    | number
    | null

  IsTrainingLocked?: boolean

  TrainingLockID?:
    | number
    | null

  LockLevel?:
    | 'Full'
    | 'Restricted'
    | null

  MaxIntensity?:
    | number
    | null

  LockEndDate?:
    | string
    | null
}

export function getTrainingDashboard(
  horseId?: number | string,
) {
  return apiGet<
    TrainingDashboardItem[]
  >(
    `/training-dashboard${buildQuery({
      HorseID: horseId,
    })}`,
  )
}