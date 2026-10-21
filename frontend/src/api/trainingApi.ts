import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from './apiClient.ts'

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined

function buildQuery(
  params: Record<string, QueryValue>,
) {
  const query =
    new URLSearchParams()

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

  const result =
    query.toString()

  return result
    ? `?${result}`
    : ''
}

/* =========================================================
 * COMMON TYPES
 * ======================================================= */

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

export type TrainingEvaluation =
  | 'Excellent'
  | 'Good'
  | 'Average'
  | 'Needs Improvement'

export type TrainingPlanStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Active'
  | 'Completed'
  | 'Cancelled'

export type TrainingSessionStatus =
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Missed'

/* =========================================================
 * SPECIALIZATION
 * ======================================================= */

export interface Specialization {
  SpecializationID: number
  SpecializationCode: string
  SpecializationName: string
  Description: string | null
  Status: 'Active' | 'Inactive'
}

export function getSpecializations() {
  return apiGet<Specialization[]>(
    '/specializations',
  )
}

/* =========================================================
 * TRAINER PROFILE
 * ======================================================= */

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

export interface TrainerCredentialInput {
  CredentialType:
    | 'Degree'
    | 'Certificate'
    | 'License'
    | 'Award'

  Title: string

  IssuedBy?:
    | string
    | null

  IssuedDate: string

  ExpiryDate?:
    | string
    | null

  FileUrl?:
    | string
    | null

  Note?:
    | string
    | null
}

export interface TrainerRaceResult {
  RaceResultID: number

  TrainerID: number

  HorseID:
    | number
    | null

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

export interface TrainerRaceResultInput {
  HorseID?:
    | number
    | null

  HorseName?:
    | string
    | null

  RaceDate: string

  RaceName: string

  RaceClass?:
    | 'Group 1'
    | 'Group 2'
    | 'Group 3'
    | 'Listed'
    | 'Handicap'
    | 'Maiden'
    | 'Other'

  FinishPosition: number

  FieldSize: number

  Note?:
    | string
    | null
}

export interface TrainerSummary {
  UserID: number

  FullName: string

  Email: string

  Phone: string | null

  Specializations:
    TrainerSpecialization[]

  CareerStartDate:
    | string
    | null

  YearsOfExperience: number

  ExperienceLevel:
    ExperienceLevel

  ExperienceLevelName: string

  Seniority:
    | number
    | null

  SenioritySince:
    | string
    | null

  QualificationCount: number

  AwardCount: number

  CareerStarts: number

  CareerWins: number

  CareerWinRate:
    | number
    | null

  RecentStarts: number

  RecentWins: number

  WinRate:
    | number
    | null

  PlaceRate:
    | number
    | null

  WinRateNote:
    | string
    | null

  TrainerRating:
    | number
    | null

  ActiveHorseCount: number

  HasProfile: boolean

  IsSuggested?: boolean

  MatchesSpecialization?: boolean

  MatchesLevel?: boolean

  RequiredLevel?:
    | ExperienceLevel
    | null

  SuggestionReason?:
    | string
    | null
}

export interface TrainerDetail
  extends TrainerSummary {
  ActiveHorses: Array<{
    TrainerHorseAssignmentID: number

    HorseID: number

    HorseName: string

    HorseCode:
      | string
      | null

    SpecializationName: string

    StartDate: string
  }>

  Credentials:
    TrainerCredential[]

  RecentRaceResults:
    TrainerRaceResult[]
}

export interface TrainerProfileInput {
  CareerStartDate?:
    | string
    | null

  TrainerRating?:
    | number
    | null
}

export function getTrainers(
  params: {
    SpecializationID?: number

    HorseID?:
      | number
      | string
  } = {},
) {
  return apiGet<
    TrainerSummary[]
  >(
    `/trainers${buildQuery(
      params,
    )}`,
  )
}

export function getTrainer(
  trainerId:
    | number
    | string,
) {
  return apiGet<TrainerDetail>(
    `/trainers/${trainerId}`,
  )
}

export function updateTrainerProfile(
  trainerId:
    | number
    | string,

  payload:
    TrainerProfileInput,
) {
  return apiPatch<TrainerSummary>(
    `/trainers/${trainerId}/profile`,
    payload,
  )
}

export function getTrainerCredentials(
  trainerId:
    | number
    | string,
) {
  return apiGet<
    TrainerCredential[]
  >(
    `/trainers/${trainerId}/credentials`,
  )
}

export function createTrainerCredential(
  trainerId:
    | number
    | string,

  payload:
    TrainerCredentialInput,
) {
  return apiPost<TrainerCredential>(
    `/trainers/${trainerId}/credentials`,
    payload,
  )
}

export function deleteTrainerCredential(
  credentialId:
    | number
    | string,
) {
  return apiDelete<void>(
    `/trainer-credentials/${credentialId}`,
  )
}

export function getTrainerRaceResults(
  trainerId:
    | number
    | string,

  params: {
    From?: string
    To?: string
  } = {},
) {
  return apiGet<
    TrainerRaceResult[]
  >(
    `/trainers/${trainerId}/race-results${buildQuery(
      params,
    )}`,
  )
}

export function createTrainerRaceResult(
  trainerId:
    | number
    | string,

  payload:
    TrainerRaceResultInput,
) {
  return apiPost<TrainerRaceResult>(
    `/trainers/${trainerId}/race-results`,
    payload,
  )
}

export function deleteTrainerRaceResult(
  raceResultId:
    | number
    | string,
) {
  return apiDelete<void>(
    `/trainer-race-results/${raceResultId}`,
  )
}

export function addTrainerSpecialization(
  trainerId:
    | number
    | string,

  specializationId: number,
) {
  return apiPost<{
    TrainerID: number
    SpecializationID: number
  }>(
    `/trainers/${trainerId}/specializations`,
    {
      SpecializationID:
        specializationId,
    },
  )
}

export function removeTrainerSpecialization(
  trainerId:
    | number
    | string,

  specializationId:
    | number
    | string,
) {
  return apiDelete<void>(
    `/trainers/${trainerId}/specializations/${specializationId}`,
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

  QualityScore:
    | number
    | null

  FitnessLevel:
    | FitnessLevel
    | null

  AssessmentNote:
    | string
    | null

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
  horseId:
    | number
    | string,
) {
  return apiGet<
    HorseAssessment[]
  >(
    `/horses/${horseId}/assessments`,
  )
}

export function createHorseAssessment(
  horseId:
    | number
    | string,

  payload:
    HorseAssessmentInput,
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

  AssessmentID:
    | number
    | null

  StartDate: string

  EndDate:
    | string
    | null

  Status:
    | 'Active'
    | 'Ended'

  AssignmentNote:
    | string
    | null

  TrainerExperienceLevel?:
    ExperienceLevel

  RequiredLevel?:
    | ExperienceLevel
    | null

  LevelWarning?:
    | string
    | null

  DraftTrainingPlanID?:
    | number
    | null
}

export interface AssignTrainerInput {
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
}

export function getTrainerAssignments(
  params: {
    HorseID?:
      | number
      | string

    TrainerID?:
      | number
      | string

    Status?: string

    mine?: boolean
  } = {},
) {
  return apiGet<
    TrainerAssignment[]
  >(
    `/trainer-assignments${buildQuery(
      params,
    )}`,
  )
}

export function assignTrainer(
  payload:
    AssignTrainerInput,
) {
  return apiPost<TrainerAssignment>(
    '/trainer-assignments',
    payload,
  )
}

export function endTrainerAssignment(
  assignmentId:
    | number
    | string,

  reason?: string,
) {
  return apiPost<TrainerAssignment>(
    `/trainer-assignments/${assignmentId}/end`,
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

  EndDate:
    | string
    | null

  Priority: number

  IsPreferred: boolean

  Note:
    | string
    | null
}

export function getWorkRiderPreferences(
  horseId:
    | number
    | string,

  all = false,
) {
  return apiGet<
    WorkRiderPreference[]
  >(
    `/horses/${horseId}/work-rider-preferences${buildQuery(
      {
        all,
      },
    )}`,
  )
}

export function addWorkRiderPreference(
  horseId:
    | number
    | string,

  payload: {
    WorkRiderID: number
    Priority?: number

    StartDate?:
      | string
      | null

    Note?:
      | string
      | null
  },
) {
  return apiPost<WorkRiderPreference>(
    `/horses/${horseId}/work-rider-preferences`,
    payload,
  )
}

export function endWorkRiderPreference(
  preferenceId:
    | number
    | string,
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

  Goal:
    | string
    | null

  StartDate: string

  EndDate:
    | string
    | null

  Intensity:
    | TrainingIntensity
    | null

  TrainingLoad:
    | number
    | null

  DistanceTargetKm:
    | number
    | null

  Surface:
    | string
    | null

  Note:
    | string
    | null

  ClosedAt:
    | string
    | null

  ClosedByID:
    | number
    | null

  ClosedByName:
    | string
    | null

  SummaryNote:
    | string
    | null
}

export interface TrainingPlan {
  TrainingPlanID: number

  TrainerHorseAssignmentID: number

  HorseID: number

  HorseName: string

  TrainerID: number

  TrainerName: string

  Goal:
    | string
    | null

  StartDate: string

  EndDate:
    | string
    | null

  OverallIntensity:
    | TrainingIntensity
    | null

  Note:
    | string
    | null

  Status:
    TrainingPlanStatus

  CreatedAt: string

  SubmittedAt:
    | string
    | null

  ApprovedByHeadTrainerID:
    | number
    | null

  ApprovedAt:
    | string
    | null

  ReviewNote:
    | string
    | null

  TemplateID:
    | number
    | null

  TemplateName:
    | string
    | null

  Stages:
    TrainingPlanStage[]
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

export interface TrainingPlanInput {
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

  Stages?:
    TrainingStageInput[]
}

export function getTrainingPlans(
  params: {
    HorseID?:
      | number
      | string

    TrainerID?:
      | number
      | string

    Status?: string

    mine?: boolean
  } = {},
) {
  return apiGet<
    TrainingPlan[]
  >(
    `/training-plans${buildQuery(
      params,
    )}`,
  )
}

export function getTrainingPlan(
  planId:
    | number
    | string,
) {
  return apiGet<TrainingPlan>(
    `/training-plans/${planId}`,
  )
}

export function createTrainingPlan(
  payload:
    TrainingPlanInput,
) {
  return apiPost<TrainingPlan>(
    '/training-plans',
    payload,
  )
}

export function updateTrainingPlan(
  planId:
    | number
    | string,

  payload: {
    Goal?:
      | string
      | null

    StartDate?: string

    EndDate?:
      | string
      | null

    OverallIntensity?:
      | TrainingIntensity
      | null

    Note?:
      | string
      | null
  },
) {
  return apiPatch<TrainingPlan>(
    `/training-plans/${planId}`,
    payload,
  )
}

export function addTrainingPlanStage(
  planId:
    | number
    | string,

  payload:
    TrainingStageInput,
) {
  return apiPost<TrainingPlanStage>(
    `/training-plans/${planId}/stages`,
    payload,
  )
}

export function updateTrainingPlanStage(
  stageId:
    | number
    | string,

  payload:
    Partial<TrainingStageInput>,
) {
  return apiPatch<TrainingPlanStage>(
    `/training-plan-stages/${stageId}`,
    payload,
  )
}

export function deleteTrainingPlanStage(
  stageId:
    | number
    | string,
) {
  return apiDelete<void>(
    `/training-plan-stages/${stageId}`,
  )
}

export function submitTrainingPlan(
  planId:
    | number
    | string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/submit`,
    {},
  )
}

export function approveTrainingPlan(
  planId:
    | number
    | string,

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
  planId:
    | number
    | string,

  reviewNote: string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/return`,
    {
      ReviewNote:
        reviewNote,
    },
  )
}

export function completeTrainingPlan(
  planId:
    | number
    | string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/complete`,
    {},
  )
}

export function cancelTrainingPlan(
  planId:
    | number
    | string,

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
  planId:
    | number
    | string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/revise`,
    {},
  )
}

/* =========================================================
 * TRAINING PLAN TEMPLATE
 * ======================================================= */

export interface TrainingPlanTemplateStage {
  TemplateStageID: number

  StageOrder: number

  StageName: string

  Goal:
    | string
    | null

  StartDay: number

  DurationDays: number

  Intensity:
    | TrainingIntensity
    | null

  TrainingLoad:
    | number
    | null

  DistanceTargetKm:
    | number
    | null

  Surface:
    | string
    | null

  Note:
    | string
    | null

  ExitCriteria:
    | string
    | null
}

export interface TrainingPlanTemplate {
  TemplateID: number

  ClubID: number

  SpecializationID: number

  SpecializationName: string

  SpecializationCode: string

  TemplateName: string

  Goal:
    | string
    | null

  DurationDays: number

  OverallIntensity:
    | TrainingIntensity
    | null

  DailyStructure:
    | string
    | null

  WeeklyPattern:
    | string
    | null

  Note:
    | string
    | null

  IsActive: boolean

  UpdatedBy:
    | number
    | null

  UpdatedByName:
    | string
    | null

  UpdatedAt: string

  Stages:
    TrainingPlanTemplateStage[]
}

export interface TrainingPlanTemplateChange {
  StageOrder:
    | number
    | null

  Field: string

  Template: unknown

  Plan: unknown

  Change?:
    | 'Changed'
    | 'Added'
    | 'Removed'
}

export interface TrainingPlanTemplateReview {
  TrainingPlanID: number

  Status:
    TrainingPlanStatus

  TemplateID:
    | number
    | null

  TemplateName:
    | string
    | null

  DailyStructure:
    | string
    | null

  WeeklyPattern:
    | string
    | null

  TemplateNote:
    | string
    | null

  Assessment:
    | {
        AssessmentID: number
        QualityScore:
          | number
          | null
        FitnessLevel:
          | FitnessLevel
          | null
        AssessmentNote:
          | string
          | null
        SpecializationID: number
      }
    | null

  ChangedFromTemplate:
    | boolean
    | null

  ChangeCount:
    | number
    | null

  Changes:
    | TrainingPlanTemplateChange[]
    | null
}

export function getTrainingPlanTemplates(
  params: {
    SpecializationID?:
      | number
      | string
  } = {},
) {
  return apiGet<
    TrainingPlanTemplate[]
  >(
    `/training-plan-templates${buildQuery(
      params,
    )}`,
  )
}

export function getTrainingPlanTemplate(
  templateId:
    | number
    | string,
) {
  return apiGet<TrainingPlanTemplate>(
    `/training-plan-templates/${templateId}`,
  )
}

export function getTrainingPlanTemplateReview(
  planId:
    | number
    | string,
) {
  return apiGet<TrainingPlanTemplateReview>(
    `/training-plans/${planId}/template-review`,
  )
}

export function rescheduleTrainingPlan(
  planId:
    | number
    | string,

  startDate: string,
) {
  return apiPost<TrainingPlan>(
    `/training-plans/${planId}/reschedule`,
    {
      StartDate:
        startDate,
    },
  )
}

export function createTrainingPlanFromTemplate(
  horseId:
    | number
    | string,
) {
  return apiPost<TrainingPlan>(
    '/training-plans/from-template',
    {
      HorseID:
        Number(horseId),
    },
  )
}

/* =========================================================
 * SESSION RESULT / REVIEW
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
    TrainingEvaluation

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

  HorseCode:
    | string
    | null

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

  EndTime:
    | string
    | null

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
    TrainingSessionStatus

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

export interface TrainingResultInput {
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
}

export interface TrainingReviewInput {
  Evaluation:
    TrainingEvaluation

  TrainerComment?:
    | string
    | null

  AdjustmentRequired?: boolean

  AdjustmentNote?:
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
  sessionId:
    | number
    | string,
) {
  return apiGet<TrainingSession>(
    `/training-sessions/${sessionId}`,
  )
}

export function createTrainingSession(
  payload:
    TrainingSessionInput,
) {
  return apiPost<TrainingSession>(
    '/training-sessions',
    payload,
  )
}

export function updateTrainingSession(
  sessionId:
    | number
    | string,

  payload:
    Partial<TrainingSessionInput>,
) {
  return apiPatch<TrainingSession>(
    `/training-sessions/${sessionId}`,
    payload,
  )
}

export function startTrainingSession(
  sessionId:
    | number
    | string,
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/start`,
    {},
  )
}

export function submitTrainingResult(
  sessionId:
    | number
    | string,

  payload:
    TrainingResultInput,
) {
  return apiPost<TrainingSession>(
    `/training-sessions/${sessionId}/result`,
    payload,
  )
}

export function submitSubstituteObservation(
  sessionId:
    | number
    | string,

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
  sessionId:
    | number
    | string,

  payload: {
    Reason: string

    /*
     * Flow 3 only.
     * Không tạo UI cho 3 field dưới
     * cho tới khi BE Flow 3 được merge.
     */
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
  sessionId:
    | number
    | string,

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
  sessionId:
    | number
    | string,

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
  sessionId:
    | number
    | string,

  payload:
    TrainingReviewInput,
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
  return apiGet<
    TrainingReview[]
  >(
    `/training-reviews${buildQuery(
      params,
    )}`,
  )
}

/* =========================================================
 * OWNER SUMMARY TYPES
 * ======================================================= */

export interface OwnerTrainingHealthSummary {
  TrainingLockCount: number

  HealthReportCount: number

  UrgentHealthReportCount: number

  IsLockedNow: boolean

  Text: string
}

export interface OwnerTrainingPeriodSummary {
  From: string

  To: string

  PlannedSessions: number

  CompletedSessions: number

  ReviewedSessions: number

  AwaitingReviewSessions: number

  CancelledSessions: number

  MissedSessions: number

  UpcomingSessions: number

  TotalDistanceKm: number

  DistanceTargetKm:
    | number
    | null

  DistanceProgressPercent:
    | number
    | null

  TotalDurationMinutes: number

  AvgDistancePerSessionKm:
    | number
    | null

  AvgSpeedKmh:
    | number
    | null

  MaxSpeedKmh:
    | number
    | null

  AvgPerformanceScore:
    | number
    | null

  AvgHeartRate:
    | number
    | null

  AvgRecoveryMinutes:
    | number
    | null

  Evaluations: Record<
    TrainingEvaluation,
    number
  >

  /*
   * Current Flow 2 source:
   * null vì Flow 3 chưa merge.
   */
  Health:
    | OwnerTrainingHealthSummary
    | null
}

export interface OwnerStageComparison {
  AvgSpeedKmh:
    | number
    | null

  AvgPerformanceScore:
    | number
    | null

  AvgDistancePerSessionKm:
    | number
    | null

  AvgRecoveryMinutes:
    | number
    | null
}

export interface OwnerTrainingStageSummary {
  TrainingPlanStageID: number

  StageOrder: number

  StageName: string

  Goal:
    | string
    | null

  StartDate: string

  EndDate:
    | string
    | null

  Intensity:
    | TrainingIntensity
    | null

  StageState:
    | 'NotStarted'
    | 'InProgress'
    | 'Closed'

  IsOverdue: boolean

  AsOf:
    | string
    | null

  ClosedAt:
    | string
    | null

  ClosedByName:
    | string
    | null

  SummaryNote:
    | string
    | null

  Summary:
    | OwnerTrainingPeriodSummary
    | null

  ComparedToPreviousStage:
    | OwnerStageComparison
    | null
}

export function closeTrainingPlanStage(
  stageId:
    | number
    | string,

  summaryNote?:
    | string
    | null,
) {
  return apiPost<
    OwnerTrainingStageSummary
  >(
    `/training-plan-stages/${stageId}/close`,
    {
      SummaryNote:
        summaryNote || undefined,
    },
  )
}

/* =========================================================
 * TRAINING DASHBOARD
 * ======================================================= */

export interface TrainingDashboardItem {
  HorseID: number

  HorseCode:
    | string
    | null

  HorseName: string

  Gender:
    | string
    | null

  SexClass:
    | string
    | null

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

  /*
   * Chỉ xuất hiện khi Flow 3
   * thực sự được cài.
   */
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
  horseId?:
    | number
    | string,
) {
  return apiGet<
    TrainingDashboardItem[]
  >(
    `/training-dashboard${buildQuery(
      {
        HorseID:
          horseId,
      },
    )}`,
  )
}

/* =========================================================
 * OWNER TRAINING PLANS
 * ======================================================= */

export interface OwnerTrainingPlanSummary {
  TrainingPlanID: number

  Goal:
    | string
    | null

  StartDate: string

  EndDate:
    | string
    | null

  Status:
    | 'Active'
    | 'Completed'
    | 'Cancelled'

  TrainerName: string

  SpecializationName: string

  ApprovedAt:
    | string
    | null

  ProgressPercent:
    | number
    | null

  StageCount: number

  CurrentStageName:
    | string
    | null

  Summary:
    OwnerTrainingPeriodSummary

  Stages:
    OwnerTrainingStageSummary[]
}

export type OwnerTrainingPlanListItem =
  Omit<
    OwnerTrainingPlanSummary,
    'Stages'
  >

export interface OwnerTrainingPlanListResponse {
  HorseID: number

  HorseName: string

  HorseCode:
    | string
    | null

  Plans:
    OwnerTrainingPlanListItem[]
}

export interface OwnerTrainingPlanDetail
  extends OwnerTrainingPlanSummary {
  HorseID: number

  HorseName: string

  HorseCode:
    | string
    | null
}

export function getOwnerTrainingPlans(
  horseId:
    | number
    | string,
) {
  return apiGet<
    OwnerTrainingPlanListResponse
  >(
    `/owner/horses/${horseId}/training-plans`,
  )
}

export function getOwnerTrainingPlan(
  planId:
    | number
    | string,
) {
  return apiGet<
    OwnerTrainingPlanDetail
  >(
    `/owner/training-plans/${planId}`,
  )
}

/* =========================================================
 * OWNER TRAINING SESSIONS
 * ======================================================= */

export interface OwnerTrainingSessionOverview {
  TrainingSessionID: number

  SessionDate: string

  StartTime: string

  TrainingType: string

  TrainingPlanID: number

  TrainingPlanStageID: number

  StageName: string

  Status:
    | 'Completed'
    | 'Cancelled'
    | 'Missed'

  DurationMinutes:
    | number
    | null

  DistanceKm:
    | number
    | null

  PerformanceScore:
    | number
    | null

  Evaluation:
    | TrainingEvaluation
    | null

  IsStopped: boolean

  Reason:
    | string
    | null
}

export interface OwnerTrainingSessionDetail
  extends OwnerTrainingSessionOverview {
  HorseID: number

  HorseName: string

  TrainerName: string

  WorkRiderName: string

  Surface:
    | string
    | null

  Location:
    | string
    | null

  DurationPlannedMinutes:
    | number
    | null

  DistancePlannedKm:
    | number
    | null

  TargetSpeedKmh:
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

  RiderObservation:
    | string
    | null

  VideoUrl:
    | string
    | null

  TrainerComment:
    | string
    | null

  AdjustmentRequired: boolean

  AdjustmentNote:
    | string
    | null

  ReviewedBy:
    | string
    | null

  ReviewDate:
    | string
    | null
}

export function getOwnerTrainingSessions(
  horseId:
    | number
    | string,

  params: {
    From?: string

    To?: string

    TrainingPlanID?:
      | number
      | string

    TrainingPlanStageID?:
      | number
      | string
  } = {},
) {
  return apiGet<
    OwnerTrainingSessionOverview[]
  >(
    `/owner/horses/${horseId}/training-sessions${buildQuery(
      params,
    )}`,
  )
}

export function getOwnerTrainingSession(
  sessionId:
    | number
    | string,
) {
  return apiGet<
    OwnerTrainingSessionDetail
  >(
    `/owner/training-sessions/${sessionId}`,
  )
}

/* =========================================================
 * NOTIFICATIONS
 * ======================================================= */

export interface NotificationItem {
  Type: string

  Priority:
    | 'High'
    | 'Normal'

  Title: string

  Message:
    | string
    | null

  EntityName: string

  EntityID: number

  HorseID:
    | number
    | null

  HorseName:
    | string
    | null

  At:
    | string
    | null
}

export function getNotifications() {
  return apiGet<
    NotificationItem[]
  >(
    '/notifications',
  )
}