import {
  ADMINISTRATION_ROUTES,
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ARRIVAL_STATUSES,
  ARTICLE_KINDS,
  ARTICLE_ORIGINS,
  ASSESSMENT_SOURCES,
  AlertModel,
  AlertRuleModel,
  ArticleModel,
  AuditLogModel,
  BIOSECURITY_ENTRY_TYPES,
  BROODER_BEHAVIOURS,
  BiosecurityLogModel,
  BirdWeightModel,
  BrooderCheckModel,
  BroodingProfileModel,
  BuyerModel,
  CATEGORY_FOR_RULE,
  CHECKLIST_KINDS,
  CHECKLIST_RESPONSE_TYPES,
  CLEANING_SCHEDULES,
  CONTENT_CATEGORIES,
  CONTENT_KINDS,
  CONTENT_STATUSES,
  Celsius,
  ChecklistTemplateModel,
  ChickArrivalModel,
  ChickLotModel,
  CleaningTaskModel,
  Count,
  CounterModel,
  CountryCode,
  CurrencyCode,
  Cursor,
  DailyRecordModel,
  DomainError,
  EGG_GRADES,
  EGG_REJECT_REASONS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  EXPENSE_STATUSES,
  EggInventoryModel,
  EggRecordModel,
  Email,
  EquipmentModel,
  EquipmentMovementModel,
  ExpenseModel,
  FEED_CONSUMPTION_KINDS,
  FEED_STAGES,
  FLOCK_EVENT_TYPES,
  FLOCK_STATUSES,
  FLOCK_TYPES,
  FULFILMENT_METHODS,
  FarmModel,
  FeedConsumptionModel,
  FlockEventModel,
  FlockModel,
  GeoPoint,
  GlossaryTermModel,
  Grams,
  HATCHERY_BATCH_STATUSES,
  HEALTH_RECORD_TYPES,
  HOUSE_TYPES,
  HatcheryBatchModel,
  HatcheryEventModel,
  HealthRecordModel,
  HouseModel,
  INCOME_CATEGORIES,
  INCOME_KINDS,
  INCUBATION_DAYS,
  INVENTORY_CATEGORIES,
  IanaTimezone,
  Id,
  IdempotencyModel,
  IncomeModel,
  Instant,
  InventoryItemModel,
  InventoryLotModel,
  InventoryTransactionModel,
  Kilograms,
  LEDGER_CATEGORIES,
  LEDGER_DIRECTIONS,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  LocalDate,
  MARKET_PRODUCTS,
  MEDICINE_TYPES,
  MEMBERSHIP_STATUSES,
  MONEY_ACCOUNT_TYPES,
  MORTALITY_CAUSES,
  MarketListingModel,
  MediaAssetModel,
  MedicineModel,
  MembershipModel,
  Money,
  MoneyAccountModel,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_INFO,
  NonEmptyText,
  NotificationModel,
  NotificationPreferenceModel,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  OneTimeTokenModel,
  OptionalText,
  OrderModel,
  OrderPaymentModel,
  PAYMENT_METHODS,
  PEST_TYPES,
  PRICE_UNITS,
  PUSH_PLATFORMS,
  PageQuery,
  Password,
  PositiveCount,
  PushDeviceModel,
  RECURRING_FREQUENCIES,
  REMINDER_STATUSES,
  REPORT_FORMATS,
  REPORT_TYPES,
  RESERVING_STATUSES,
  ROLES,
  RULE_DEFINITIONS,
  RULE_FOR_ALERT,
  RULE_KEYS,
  RecurringExpenseModel,
  RefreshTokenModel,
  SESSION_PLATFORMS,
  SPECIES,
  STOCK_UNITS,
  SessionModel,
  SupplierModel,
  SyncChangeModel,
  SyncOperationModel,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskModel,
  TrainingCourseModel,
  TrainingProgressModel,
  TransactionModel,
  UNIT_SYSTEMS,
  USER_STATUSES,
  UserModel,
  VISITOR_TYPES,
  VaccinationModel,
  VaccinationProgrammeModel,
  VisitorModel,
  WATER_QUALITY_RATINGS,
  WATER_SOURCES,
  WATER_TREATMENTS,
  WITHDRAWAL_SOURCES,
  WaterRecordModel,
  WeatherCacheModel,
  WeatherObservationModel,
  acquisitionCostPerBird,
  activeWithdrawal,
  addDays,
  addMonthsClamped,
  ageBucket,
  ageDays,
  allocate,
  applyTax,
  assertBands,
  assertCanClose,
  assertEventAllowed,
  assertHatchEventAllowed,
  assertOrderTransition,
  assertPaymentFits,
  assertTransition,
  averageDailyUseKg,
  averageUnitCost,
  baselineOf,
  batchCounts,
  birdsAvailable,
  computeFlockMetrics,
  dateRange,
  daysBetween,
  daysOfCover,
  deviationFrom,
  effectiveEvents,
  effectiveHatchEvents,
  effectiveParams,
  evaluateBrooderCheck,
  evaluateChecklist,
  evaluateWater,
  expectedTransferDate,
  expiryStatus,
  formatCell,
  hatcheryMetrics,
  henDayPercent,
  isExpired,
  lastNDates,
  localDateOf,
  overallHatchOfSet,
  paymentStatus,
  population,
  q3,
  reversibleHatchEvent,
  safeText,
  scheduleProgramme,
  sheetValue,
  stageFor,
  stockTotals,
  treatmentEndDate,
  vaccinationState,
  validateRuleParams,
  visitorDowntime,
  weatherRisks,
  weighSessionStats,
  weightCurve,
  withdrawalUntil
} from "./chunk-6YTPLJIP.js";

// src/adapters/s3-storage.ts
import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// src/adapters/storage.ts
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { dirname, join, resolve, sep } from "path";
var SAFE_KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;
function memoryMediaStorage() {
  const objects = /* @__PURE__ */ new Map();
  return {
    objects,
    async put(key, bytes, contentType) {
      objects.set(key, { bytes: Buffer.from(bytes), contentType });
    },
    async get(key) {
      return objects.get(key) ?? null;
    },
    async delete(key) {
      objects.delete(key);
    }
  };
}
function localDiskMediaStorage(rootDir) {
  const root = resolve(rootDir);
  const pathOf = (key) => {
    if (!SAFE_KEY.test(key)) throw new Error("Invalid storage key");
    const p6 = resolve(join(root, key));
    if (!p6.startsWith(root + sep)) throw new Error("Invalid storage key");
    return p6;
  };
  return {
    async put(key, bytes, contentType) {
      const p6 = pathOf(key);
      await mkdir(dirname(p6), { recursive: true });
      await writeFile(p6, bytes);
      await writeFile(`${p6}.type`, contentType);
    },
    async get(key) {
      const p6 = pathOf(key);
      try {
        const [bytes, contentType] = await Promise.all([readFile(p6), readFile(`${p6}.type`, "utf8")]);
        return { bytes, contentType };
      } catch {
        return null;
      }
    },
    async delete(key) {
      const p6 = pathOf(key);
      await rm(p6, { force: true });
      await rm(`${p6}.type`, { force: true });
    }
  };
}

// src/adapters/s3-storage.ts
function s3MediaStorage(cfg, client = new S3Client({ region: cfg.region, ...cfg.endpoint ? { endpoint: cfg.endpoint } : {}, forcePathStyle: cfg.forcePathStyle ?? !!cfg.endpoint })) {
  const check = (key) => {
    if (!SAFE_KEY.test(key)) throw new Error("Invalid storage key");
    return key;
  };
  return {
    async put(key, bytes, contentType) {
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: check(key), Body: bytes, ContentType: contentType, ServerSideEncryption: cfg.endpoint ? void 0 : "AES256" }));
    },
    async get(key) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: check(key) }));
        if (!r.Body) return null;
        const bytes = Buffer.from(await r.Body.transformToByteArray());
        return { bytes, contentType: r.ContentType ?? "application/octet-stream" };
      } catch (e) {
        if (e instanceof NoSuchKey || e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return null;
        throw e;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: check(key) }));
    }
  };
}

// src/adapters/smtp.ts
import nodemailer from "nodemailer";
function smtpEmailSender(cfg, transport = nodemailer.createTransport(cfg.url)) {
  return {
    async send(m) {
      await transport.sendMail({ from: cfg.from, to: m.to, subject: m.subject, text: m.text });
    }
  };
}
function bestEffortEmail(inner, logger) {
  return {
    async send(m) {
      try {
        await inner.send(m);
      } catch (err) {
        logger.error({ err, kind: m.kind }, "email could not be sent");
      }
    }
  };
}

// src/adapters/fcm.ts
import { JWT } from "google-auth-library";
var GONE = /* @__PURE__ */ new Set(["UNREGISTERED", "SENDER_ID_MISMATCH"]);
var TEMPORARY = /* @__PURE__ */ new Set(["QUOTA_EXCEEDED", "UNAVAILABLE", "INTERNAL"]);
var FcmConfigError = class extends Error {
  retryable = false;
};
function fcmMessage(m, token) {
  const critical = m.severity === "critical";
  const data = Object.fromEntries(
    Object.entries({ notificationId: m.notificationId, category: m.category, severity: m.severity, path: m.link?.path, entity: m.link?.entity, entityId: m.link?.id }).filter(([, v]) => typeof v === "string" && v.length > 0)
  );
  return {
    message: {
      token,
      notification: { title: m.title, body: m.body },
      data,
      android: {
        priority: critical || m.severity === "warning" ? "high" : "normal",
        collapse_key: m.notificationId,
        // The tag makes a repeat replace the shown notification instead of adding a second one.
        notification: { tag: m.notificationId }
      },
      apns: {
        headers: { "apns-collapse-id": m.notificationId.slice(0, 64), "apns-priority": critical || m.severity === "warning" ? "10" : "5" },
        payload: { aps: { "thread-id": m.category ?? "general", sound: "default" } }
      }
    }
  };
}
function fcmPushProvider(cfg, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const jwt = new JWT({ email: cfg.clientEmail, key: cfg.privateKey, scopes: ["https://www.googleapis.com/auth/firebase.messaging"] });
  const accessToken = deps.accessToken ?? (async () => {
    const t = await jwt.getAccessToken();
    if (!t.token) throw new Error("Could not get an FCM access token");
    return t.token;
  });
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/messages:send`;
  return {
    channel: "push",
    name: "fcm",
    async send(m) {
      const token = await accessToken();
      const sentTokens = [];
      const retryTokens = [];
      const invalidTokens = [];
      let providerMessageId;
      for (const device of m.pushTokens ?? []) {
        let res;
        try {
          res = await fetchImpl(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(fcmMessage(m, device)) });
        } catch {
          retryTokens.push(device);
          continue;
        }
        if (res.ok) {
          sentTokens.push(device);
          providerMessageId = (await res.json().catch(() => ({}))).name ?? providerMessageId;
          continue;
        }
        const err = (await res.json().catch(() => ({}))).error;
        const code = err?.details?.find((x) => x.errorCode)?.errorCode ?? err?.status ?? String(res.status);
        if (GONE.has(code) || res.status === 404) invalidTokens.push(device);
        else if (TEMPORARY.has(code) || res.status === 429 || res.status >= 500) retryTokens.push(device);
        else if (res.status === 401 || res.status === 403 || code === "THIRD_PARTY_AUTH_ERROR") throw new FcmConfigError(`FCM refused the credentials (${code}): check the service account and APNs key`);
      }
      return { sentTokens, retryTokens, invalidTokens, ...providerMessageId ? { providerMessageId } : {} };
    }
  };
}

// src/adapters/external.ts
import { hash, verify } from "@node-rs/argon2";
import { OAuth2Client } from "google-auth-library";
var argon2Hasher = {
  hash: (password) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 }),
  verify: (h, password) => verify(h, password).catch(() => false)
};
function logEmailSender(logger) {
  return {
    async send(m) {
      logger.info({ to: m.to, kind: m.kind, subject: m.subject }, "email queued (dev sender)");
    }
  };
}
function googleVerifier(clientIds) {
  const client = new OAuth2Client();
  return {
    async verify(idToken) {
      const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
      const p6 = ticket.getPayload();
      if (!p6?.sub || !p6.email) throw new Error("Google token missing subject or email");
      return { sub: p6.sub, email: p6.email, emailVerified: p6.email_verified === true, ...p6.name ? { name: p6.name } : {} };
    }
  };
}

// src/adapters/mongo/index.ts
import { AsyncLocalStorage } from "async_hooks";
import mongoose from "mongoose";

// ../../packages/constants/src/errors.ts
var ERROR_CODES = {
  VALIDATION_FAILED: 400,
  INVALID_JSON: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_REUSED: 401,
  SESSION_REVOKED: 401,
  ACCOUNT_DISABLED: 403,
  EMAIL_NOT_VERIFIED: 403,
  ROLE_HIERARCHY: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  ALREADY_MEMBER: 409,
  VERSION_CONFLICT: 409,
  DUPLICATE: 409,
  /** Looks like something already recorded (e.g. the same bill twice); resend with allowDuplicate after checking. */
  POSSIBLE_DUPLICATE: 409,
  IDEMPOTENCY_IN_PROGRESS: 409,
  PAYLOAD_TOO_LARGE: 413,
  IDEMPOTENCY_KEY_REUSED: 422,
  LAST_OWNER: 422,
  INVALID_STATE_TRANSITION: 422,
  INSUFFICIENT_BIRDS: 422,
  CAPACITY_EXCEEDED: 422,
  WITHDRAWAL_ACTIVE: 422,
  INSUFFICIENT_FUNDS: 422,
  WEATHER_UNAVAILABLE: 503,
  CHECKLIST_INCOMPLETE: 422,
  INSUFFICIENT_STOCK: 422,
  FLOCK_CLOSED: 422,
  OVERPAYMENT: 422,
  UNKNOWN_COMMAND: 422,
  INVITE_INVALID: 422,
  TOKEN_INVALID: 422,
  SAME_PASSWORD: 422,
  CURRENT_PASSWORD_INCORRECT: 422,
  ACCOUNT_LOCKED: 429,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503
};

// ../../packages/constants/src/permissions.ts
var ACTIONS = [
  // farm administration
  "farm.read",
  "farm.update_settings",
  "farm.delete",
  "member.read",
  "member.invite",
  "member.change_role",
  "member.remove",
  "audit.read",
  // production
  "production.read",
  "production.record",
  // create daily records, mortality, eggs, feed issue, weigh-ins
  "production.edit_own_recent",
  // edit own entries for today and yesterday (farm-local)
  "production.edit_any",
  "production.delete",
  "flock.manage",
  // create/place/transfer/close flocks, houses
  "flock.sell",
  // health
  "health.read",
  "health.record_observation",
  "health.manage",
  // vet visits, treatments, medicines, programmes
  "health.vaccinate",
  // record vaccinations given
  // biosecurity
  "biosecurity.read",
  "biosecurity.record",
  "biosecurity.manage",
  // money & market
  "money.read",
  "money.record",
  "money.delete",
  "market.read",
  "market.manage",
  "payment.record",
  // hatchery
  "hatchery.read",
  "hatchery.record",
  // candling, readings, transfer, hatch, grading
  "hatchery.manage",
  // set and cancel batches
  // inventory (feed, medicine, supplies)
  "inventory.read",
  "inventory.issue",
  // record use and wastage
  "inventory.manage",
  // catalog, purchases, stock counts
  "alert.manage",
  // acknowledge alerts, run checks
  "task.read",
  "task.complete",
  // start and finish tasks
  "task.manage",
  // create, assign, edit, cancel and reopen tasks
  // content
  "content.read"
];
var ALL = ACTIONS;
var except = (...remove) => new Set(ALL.filter((a) => !remove.includes(a)));
var WORKER = [
  "farm.read",
  "hatchery.read",
  "hatchery.record",
  "inventory.read",
  "inventory.issue",
  "production.read",
  "production.record",
  "production.edit_own_recent",
  "health.read",
  "health.record_observation",
  "biosecurity.read",
  "biosecurity.record",
  "content.read",
  "task.read",
  "task.complete"
];
var ROLE_PERMISSIONS = {
  owner: new Set(ALL),
  admin: except("farm.delete"),
  farm_manager: /* @__PURE__ */ new Set([
    "farm.read",
    "member.read",
    "member.invite",
    "member.change_role",
    "member.remove",
    "audit.read",
    "production.read",
    "production.record",
    "production.edit_own_recent",
    "production.edit_any",
    "production.delete",
    "flock.manage",
    "flock.sell",
    "health.read",
    "health.record_observation",
    "health.manage",
    "health.vaccinate",
    "biosecurity.read",
    "biosecurity.record",
    "biosecurity.manage",
    "money.read",
    "money.record",
    "market.read",
    "market.manage",
    "payment.record",
    "inventory.read",
    "inventory.issue",
    "inventory.manage",
    "alert.manage",
    "hatchery.read",
    "hatchery.record",
    "hatchery.manage",
    "content.read",
    "task.read",
    "task.complete",
    "task.manage"
  ]),
  supervisor: /* @__PURE__ */ new Set([...WORKER, "member.read", "production.edit_any", "biosecurity.manage", "alert.manage", "health.vaccinate", "task.manage"]),
  worker: new Set(WORKER),
  accountant: /* @__PURE__ */ new Set([
    "farm.read",
    "production.read",
    "money.read",
    "money.record",
    "money.delete",
    "market.read",
    "payment.record",
    "inventory.read",
    "inventory.manage",
    "hatchery.read",
    "content.read",
    "task.read"
  ]),
  vet: /* @__PURE__ */ new Set([
    "farm.read",
    "production.read",
    "health.read",
    "health.record_observation",
    "health.manage",
    "health.vaccinate",
    "biosecurity.read",
    "inventory.read",
    "inventory.issue",
    "hatchery.read",
    "content.read",
    "task.read",
    "task.complete"
  ])
};
function can(role, action) {
  return ROLE_PERMISSIONS[role].has(action);
}
function permissionsFor(role) {
  return ACTIONS.filter((a) => ROLE_PERMISSIONS[role].has(a));
}
var ROLE_RANK = {
  owner: 100,
  admin: 80,
  farm_manager: 60,
  supervisor: 40,
  accountant: 30,
  vet: 30,
  worker: 20
};
function canManageRole(actor, role) {
  return actor === "owner" || ROLE_RANK[actor] > ROLE_RANK[role];
}

// ../../packages/constants/src/api.ts
var API_VERSION = "v1";
var API_PREFIX = `/api/${API_VERSION}`;
var HEADERS = {
  requestId: "X-Request-Id",
  deviceId: "X-Device-Id",
  idempotencyKey: "Idempotency-Key",
  idempotentReplayed: "Idempotent-Replayed"
};

// ../../packages/validation/src/enums.ts
import { z } from "zod";
var Species = z.enum(SPECIES);
var FlockType = z.enum(FLOCK_TYPES);
var FlockEventType = z.enum(FLOCK_EVENT_TYPES);
var FlockStatus = z.enum(FLOCK_STATUSES);
var HouseType = z.enum(HOUSE_TYPES);
var MortalityCause = z.enum(MORTALITY_CAUSES);
var EggGrade = z.enum(EGG_GRADES);
var HealthRecordType = z.enum(HEALTH_RECORD_TYPES);
var ReminderStatus = z.enum(REMINDER_STATUSES);
var LedgerDirection = z.enum(LEDGER_DIRECTIONS);
var LedgerCategory = z.enum(LEDGER_CATEGORIES);
var RecurringFrequency = z.enum(RECURRING_FREQUENCIES);
var OrderStatus = z.enum(ORDER_STATUSES);
var PaymentMethod = z.enum(PAYMENT_METHODS);
var ListingCategory = z.enum(LISTING_CATEGORIES);
var BiosecurityEntryType = z.enum(BIOSECURITY_ENTRY_TYPES);
var AlertSeverity = z.enum(ALERT_SEVERITIES);
var ContentKind = z.enum(CONTENT_KINDS);
var Role = z.enum(ROLES);
var MembershipStatus = z.enum(MEMBERSHIP_STATUSES);
var UnitSystem = z.enum(UNIT_SYSTEMS);
var UserStatus = z.enum(USER_STATUSES);
var SessionPlatform = z.enum(SESSION_PLATFORMS);
var InventoryCategory = z.enum(INVENTORY_CATEGORIES);
var StockUnit = z.enum(STOCK_UNITS);
var FeedStage = z.enum(FEED_STAGES);
var FeedConsumptionKind = z.enum(FEED_CONSUMPTION_KINDS);
var WaterSource = z.enum(WATER_SOURCES);
var WaterTreatment = z.enum(WATER_TREATMENTS);
var WaterQualityRating = z.enum(WATER_QUALITY_RATINGS);
var AlertRuleType = z.enum(ALERT_RULE_TYPES);
var AlertStatus = z.enum(ALERT_STATUSES);
var AssessmentSource = z.enum(ASSESSMENT_SOURCES);
var WithdrawalSource = z.enum(WITHDRAWAL_SOURCES);
var MedicineType = z.enum(MEDICINE_TYPES);
var AdministrationRoute = z.enum(ADMINISTRATION_ROUTES);
var ChecklistKind = z.enum(CHECKLIST_KINDS);
var ChecklistResponseType = z.enum(CHECKLIST_RESPONSE_TYPES);
var PestType = z.enum(PEST_TYPES);
var VisitorType = z.enum(VISITOR_TYPES);
var EquipmentType = z.enum(EQUIPMENT_TYPES);
var EquipmentStatus = z.enum(EQUIPMENT_STATUSES);
var CleaningSchedule = z.enum(CLEANING_SCHEDULES);
var TaskPriority = z.enum(TASK_PRIORITIES);
var TaskStatus = z.enum(TASK_STATUSES);

// ../../packages/validation/src/schemas/system.ts
import { z as z2 } from "zod";
var ErrorEnvelope = z2.object({
  error: z2.object({
    code: z2.string(),
    message: z2.string(),
    details: z2.unknown().optional(),
    requestId: z2.string().optional()
  })
});
var DependencyStatus = z2.object({
  status: z2.enum(["up", "down"]),
  latencyMs: z2.number().nonnegative().optional(),
  error: z2.string().optional()
});
var HealthResponse = z2.object({
  status: z2.enum(["ok", "degraded"]),
  version: z2.string(),
  environment: z2.string(),
  uptimeSeconds: z2.number().nonnegative(),
  timestamp: z2.string(),
  checks: z2.object({ mongodb: DependencyStatus })
});
var LivenessResponse = z2.object({ status: z2.literal("ok") });

// ../../packages/validation/src/schemas/auth.ts
import { z as z3 } from "zod";
var Token = z3.string().min(20).max(500);
var DeviceInfo = z3.object({
  deviceId: z3.string().trim().min(1).max(100).optional(),
  name: z3.string().trim().min(1).max(100).optional(),
  platform: SessionPlatform.default("other")
}).strict();
var RegisterRequest = z3.object({
  email: Email,
  password: Password,
  fullName: NonEmptyText(120),
  farm: z3.object({
    name: NonEmptyText(120),
    timezone: IanaTimezone,
    currency: CurrencyCode,
    unitSystem: UnitSystem.default("metric"),
    countryCode: CountryCode.optional()
  }),
  device: DeviceInfo.optional()
});
var LoginRequest = z3.object({ email: Email, password: z3.string().min(1).max(200), device: DeviceInfo.optional() });
var GoogleLoginRequest = z3.object({ idToken: z3.string().min(20).max(4096), device: DeviceInfo.optional() });
var RefreshRequest = z3.object({ refreshToken: Token });
var LogoutRequest = z3.object({ refreshToken: Token.optional() });
var VerifyEmailRequest = z3.object({ token: Token });
var ForgotPasswordRequest = z3.object({ email: Email });
var ResetPasswordRequest = z3.object({ token: Token, newPassword: Password });
var UpdateProfileRequest = z3.object({ fullName: NonEmptyText(120), phone: z3.string().trim().max(30).optional() }).strict();
var ChangePasswordRequest = z3.object({ currentPassword: z3.string().min(1).max(200), newPassword: Password });
var TokenPair = z3.object({
  accessToken: z3.string(),
  accessTokenExpiresAt: z3.string(),
  refreshToken: z3.string(),
  refreshTokenExpiresAt: z3.string(),
  sessionId: z3.string()
});
var UserView = z3.object({
  id: z3.string(),
  email: z3.string(),
  fullName: z3.string(),
  phone: z3.string().optional(),
  /** PoultryPilot staff roles (content editing); empty for everyone else. */
  platformRoles: z3.array(z3.string()),
  emailVerified: z3.boolean(),
  hasPassword: z3.boolean(),
  googleLinked: z3.boolean(),
  createdAt: z3.string()
});
var SessionView = z3.object({
  id: z3.string(),
  deviceName: z3.string().optional(),
  platform: SessionPlatform,
  userAgent: z3.string().optional(),
  ipAddress: z3.string().optional(),
  createdAt: z3.string(),
  lastUsedAt: z3.string(),
  expiresAt: z3.string(),
  current: z3.boolean()
});
var MeResponse = z3.object({
  user: UserView,
  sessionId: z3.string(),
  memberships: z3.array(
    z3.object({
      membershipId: z3.string(),
      farmId: z3.string(),
      farmName: z3.string(),
      role: Role,
      permissions: z3.array(z3.string())
    })
  )
});

// ../../packages/validation/src/schemas/farm.ts
import { z as z4 } from "zod";
var FarmSettings = z4.object({
  timezone: IanaTimezone,
  currency: CurrencyCode,
  unitSystem: UnitSystem,
  /** Whether FCR divides by weight of dead birds too. Integrators differ; the UI labels it. */
  fcrIncludesMortalityWeight: z4.boolean().default(false),
  /** Workers may edit their own production entries for this many farm-local days (0 = today only). */
  workerEditWindowDays: z4.number().int().min(0).max(7).default(1),
  /** The farm's own rule: hours between a visitor's last poultry contact and entry. Omit to not check. */
  visitorDowntimeHours: z4.number().nonnegative().max(1e4).optional()
});
var CreateFarmRequest = z4.object({
  name: NonEmptyText(120),
  timezone: IanaTimezone,
  currency: CurrencyCode,
  unitSystem: UnitSystem.default("metric"),
  countryCode: CountryCode.optional()
});
var ReplaceFarmRequest = z4.object({
  name: NonEmptyText(120),
  description: OptionalText(2e3),
  countryCode: CountryCode.optional(),
  locationLabel: OptionalText(200),
  location: GeoPoint.optional(),
  timezone: IanaTimezone,
  /** Currency changes are allowed only while the farm has no ledger entries (enforced server-side). */
  currency: CurrencyCode,
  unitSystem: UnitSystem,
  fcrIncludesMortalityWeight: z4.boolean(),
  workerEditWindowDays: z4.number().int().min(0).max(7),
  visitorDowntimeHours: z4.number().nonnegative().max(1e4).optional(),
  version: z4.number().int().nonnegative()
}).strict();
var FarmView = z4.object({
  id: z4.string(),
  name: z4.string(),
  description: z4.string().optional(),
  countryCode: z4.string().optional(),
  locationLabel: z4.string().optional(),
  location: GeoPoint.optional(),
  settings: FarmSettings,
  version: z4.number(),
  createdAt: z4.string(),
  updatedAt: z4.string(),
  myRole: Role.optional(),
  myPermissions: z4.array(z4.string()).optional()
});
var AddMemberRequest = z4.object({ email: Email, role: Role }).strict();
var AcceptInviteRequest = z4.object({ token: z4.string().min(20).max(500) });
var UpdateMemberRequest = z4.object({ role: Role }).strict();
var MembershipView = z4.object({
  id: z4.string(),
  farmId: z4.string(),
  userId: z4.string().optional(),
  email: z4.string(),
  fullName: z4.string().optional(),
  role: Role,
  status: MembershipStatus,
  invitedAt: z4.string().optional(),
  joinedAt: z4.string().optional(),
  createdAt: z4.string()
});

// ../../packages/validation/src/schemas/flock.ts
import { z as z5 } from "zod";
var CreateHouseRequest = z5.object({
  id: Id.optional(),
  name: NonEmptyText(80),
  type: HouseType,
  capacityBirds: PositiveCount.optional(),
  floorAreaM2: z5.number().positive().max(1e6).optional(),
  notes: OptionalText(1e3)
}).strict();
var ReplaceHouseRequest = CreateHouseRequest.omit({ id: true }).extend({ status: z5.enum(["active", "inactive"]), version: z5.number().int().nonnegative() }).strict();
var HouseView = z5.object({
  id: z5.string(),
  name: z5.string(),
  type: HouseType,
  capacityBirds: z5.number().optional(),
  floorAreaM2: z5.number().optional(),
  status: z5.enum(["active", "inactive"]),
  notes: z5.string().optional(),
  version: z5.number(),
  createdAt: z5.string(),
  updatedAt: z5.string()
});
var Placement = z5.object({
  date: LocalDate,
  count: PositiveCount,
  deadOnArrival: Count.default(0),
  /** Average weight per bird at placement, grams (e.g. 40 for day-old broiler chicks). */
  startingWeightG: Grams.positive().optional(),
  /** Total cost of the birds placed. */
  chickCost: Money.optional(),
  ageDaysAtPlacement: z5.number().int().min(0).max(2e3).default(0),
  /** Place from a chick lot in inventory: the lot is drawn down, and its unit cost is used if chickCost is not given. */
  chickLotId: Id.optional()
}).strict().refine((p6) => p6.deadOnArrival <= p6.count, { message: "Dead on arrival cannot exceed birds placed", path: ["deadOnArrival"] });
var FlockBase = z5.object({
  name: NonEmptyText(120),
  flockCode: z5.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._\-/ ]+$/, "Letters, digits, spaces and . _ - / only"),
  type: FlockType,
  /** Required when type is custom, e.g. "Kadaknath", "Geese". */
  customTypeName: NonEmptyText(60).optional(),
  species: Species.default("chicken"),
  breed: OptionalText(120),
  strain: OptionalText(120),
  /** Where the birds came from: hatchery or supplier name. */
  source: OptionalText(200),
  houseId: Id,
  hatchDate: LocalDate.optional(),
  targetSaleDate: LocalDate.optional(),
  notes: OptionalText(2e3)
});
var customNeedsName = (f) => f.type !== "custom" || !!f.customTypeName;
var CreateFlockRequest = FlockBase.extend({ id: Id.optional(), flockCode: FlockBase.shape.flockCode.optional(), placement: Placement.optional() }).strict().refine(customNeedsName, { message: "Name the custom poultry type", path: ["customTypeName"] });
var ReplaceFlockRequest = FlockBase.omit({ type: true, species: true, houseId: true }).extend({ version: z5.number().int().nonnegative() }).strict();
var FlockListQuery = z5.object({
  status: FlockStatus.optional(),
  houseId: Id.optional(),
  type: FlockType.optional()
});
var note = OptionalText(1e3);
var PlaceFlockRequest = Placement;
var MortalityRequest = z5.object({ date: LocalDate, count: PositiveCount, cause: MortalityCause.default("unknown"), notes: note }).strict();
var CullRequest = z5.object({ date: LocalDate, count: PositiveCount, reason: OptionalText(200), notes: note }).strict();
var TransferRequest = z5.discriminatedUnion("mode", [
  /** Move the whole flock to another house. The bird count does not change. */
  z5.object({ mode: z5.literal("house"), date: LocalDate, toHouseId: Id, notes: note }).strict(),
  /** Move some birds into another active flock. */
  z5.object({ mode: z5.literal("flock"), date: LocalDate, toFlockId: Id, birds: PositiveCount, totalLiveWeightKg: Kilograms.positive().optional(), notes: note }).strict()
]);
var SplitRequest = z5.object({
  date: LocalDate,
  birds: PositiveCount,
  totalLiveWeightKg: Kilograms.positive().optional(),
  newFlock: z5.object({ id: Id.optional(), name: NonEmptyText(120), flockCode: FlockBase.shape.flockCode, houseId: Id }).strict(),
  notes: note
}).strict();
var MergeRequest = z5.object({ date: LocalDate, intoFlockId: Id, totalLiveWeightKg: Kilograms.positive().optional(), notes: note }).strict();
var SaleRequest = z5.object({
  date: LocalDate,
  birds: PositiveCount,
  totalLiveWeightKg: Kilograms.positive().optional(),
  pricePerKg: Money.optional(),
  pricePerBird: Money.optional(),
  total: Money.optional(),
  // buyerId is added with the buyers module, so the server can check the buyer belongs to this farm.
  notes: note
}).strict().refine((s2) => [s2.pricePerKg, s2.pricePerBird, s2.total].filter(Boolean).length === 1, { message: "Give exactly one of pricePerKg, pricePerBird or total", path: ["total"] }).refine((s2) => !s2.pricePerKg || s2.totalLiveWeightKg, { message: "A price per kg needs the total live weight sold", path: ["totalLiveWeightKg"] });
var AdjustmentRequest = z5.object({ date: LocalDate, delta: z5.number().int().min(-1e7).max(1e7).refine((d) => d !== 0, "Adjustment cannot be zero"), reason: z5.string().trim().min(3).max(500) }).strict();
var WeighingRequest = z5.object({
  date: LocalDate,
  /** Individual bird weights in grams (preferred: gives uniformity and CV). */
  weightsG: z5.array(Grams.positive()).min(1).max(2e3).optional(),
  /** Or just the average and how many birds were weighed. */
  averageWeightG: Grams.positive().optional(),
  sampleSize: PositiveCount.optional(),
  notes: OptionalText(500)
}).strict().refine((w) => !!w.weightsG !== !!w.averageWeightG, { message: "Give either weightsG or averageWeightG", path: ["weightsG"] });
var CloseFlockRequest = z5.object({ date: LocalDate, notes: note }).strict();
var ReverseEventRequest = z5.object({ reason: z5.string().trim().min(3).max(500) }).strict();
var DateRangeQuery = z5.object({ from: LocalDate.optional(), to: LocalDate.optional() });
var MetricsQuery = z5.object({
  asOf: LocalDate.optional(),
  /** Live price per kg in minor units, to value birds still on the farm. */
  referencePricePerKgMinor: z5.coerce.number().int().nonnegative().optional()
});
var FlockMetricsView = z5.object({
  asOf: z5.string(),
  ageDays: z5.number().nullable(),
  stage: z5.string().nullable(),
  currentBirdCount: z5.number(),
  placed: z5.number(),
  deadOnArrival: z5.number(),
  transferredIn: z5.number(),
  birdsIn: z5.number(),
  mortalityCount: z5.number(),
  cullCount: z5.number(),
  sold: z5.number(),
  transferredOut: z5.number(),
  adjustments: z5.number(),
  mortalityRate: z5.number().nullable(),
  cullRate: z5.number().nullable(),
  survivalRate: z5.number().nullable(),
  averageWeightG: z5.number().nullable(),
  latestWeighingDate: z5.string().nullable(),
  dailyWeightGainG: z5.number().nullable(),
  recentDailyWeightGainG: z5.number().nullable(),
  feedConsumedKg: z5.number(),
  feedWastedKg: z5.number(),
  uncostedFeedKg: z5.number(),
  feedPerBirdKg: z5.number().nullable(),
  feedCostMinor: z5.number(),
  feedCostPerBirdMinor: z5.number().nullable(),
  /** Minor units per egg; can be fractional (e.g. 252.4 paise). */
  feedCostPerEggMinor: z5.number().nullable(),
  eggsCollected: z5.number(),
  liveWeightKg: z5.number().nullable(),
  weightProducedKg: z5.number().nullable(),
  /** Liveweight FCR: feed eaten ÷ (live weight + weight sold or moved out). */
  fcr: z5.number().nullable(),
  /** Days with feed recorded out of the flock's days so far; FCR is flagged below 80%. */
  feedDaysRecorded: z5.number().int(),
  feedDaysExpected: z5.number().int(),
  /** FCR in doubt: "feed_gaps" (a caution: entries missing or recorded in bulk) or "implausibly_low" (feed or weight wrong; EPEF withheld, not benchmarked). */
  fcrWarning: z5.enum(["feed_gaps", "implausibly_low"]).nullable(),
  /** Feed eaten ÷ weight gained on this farm (excludes the weight birds arrived with). */
  feedPerKgGainKg: z5.number().nullable(),
  currency: z5.string(),
  revenueMinor: z5.number(),
  cost: z5.object({ chickMinor: z5.number(), transferredInMinor: z5.number(), transferredOutMinor: z5.number(), feedMinor: z5.number(), otherMinor: z5.number(), totalMinor: z5.number() }),
  profitMinor: z5.number(),
  marginPercent: z5.number().nullable(),
  liveInventoryValueMinor: z5.number().nullable(),
  projectedProfitMinor: z5.number().nullable(),
  projectedMarginPercent: z5.number().nullable(),
  costPerBirdMinor: z5.number().nullable(),
  costPerKgProducedMinor: z5.number().nullable(),
  costsComplete: z5.boolean(),
  fcrIncludesMortalityWeight: z5.boolean()
});
var FlockView = z5.object({
  id: z5.string(),
  farmId: z5.string(),
  houseId: z5.string(),
  name: z5.string(),
  flockCode: z5.string(),
  type: FlockType,
  customTypeName: z5.string().optional(),
  species: Species,
  breed: z5.string().optional(),
  strain: z5.string().optional(),
  source: z5.string().optional(),
  hatchDate: z5.string().optional(),
  placementDate: z5.string().optional(),
  placementCount: z5.number().optional(),
  startingWeightG: z5.number().optional(),
  chickCost: Money.optional(),
  targetSaleDate: z5.string().optional(),
  closedDate: z5.string().optional(),
  status: FlockStatus,
  splitFromFlockId: z5.string().optional(),
  notes: z5.string().optional(),
  currentBirdCount: z5.number(),
  version: z5.number(),
  createdAt: z5.string(),
  updatedAt: z5.string(),
  metrics: FlockMetricsView.optional()
});
var FlockEventView = z5.object({
  id: z5.string(),
  flockId: z5.string(),
  type: FlockEventType,
  date: z5.string(),
  birds: z5.number().optional(),
  deadOnArrival: z5.number().optional(),
  delta: z5.number().optional(),
  cause: MortalityCause.optional(),
  totalLiveWeightKg: z5.number().optional(),
  averageWeightG: z5.number().optional(),
  sampleSize: z5.number().optional(),
  total: Money.optional(),
  cost: Money.optional(),
  counterpartFlockId: z5.string().optional(),
  fromHouseId: z5.string().optional(),
  toHouseId: z5.string().optional(),
  groupId: z5.string().optional(),
  dailyRecordId: z5.string().optional(),
  reason: z5.string().optional(),
  reversalOf: z5.string().optional(),
  reversed: z5.boolean(),
  createdBy: z5.string(),
  createdAt: z5.string()
});

// ../../packages/validation/src/schemas/sync.ts
import { z as z6 } from "zod";
var SyncMutation = z6.object({
  mutationId: Id,
  command: z6.string().min(1).max(80),
  entityId: Id.optional(),
  payload: z6.unknown(),
  baseVersion: z6.number().int().nonnegative().optional(),
  clientCreatedAt: z6.string().datetime({ offset: true })
});
var SyncPushRequest = z6.object({
  farmId: Id,
  deviceId: z6.string().min(1).max(100),
  mutations: z6.array(SyncMutation).min(1).max(200)
});
var SyncMutationResult = z6.discriminatedUnion("status", [
  z6.object({ mutationId: z6.string(), status: z6.literal("accepted"), entityId: z6.string().optional(), version: z6.number().optional() }),
  z6.object({ mutationId: z6.string(), status: z6.literal("rejected"), code: z6.string(), message: z6.string() }),
  z6.object({ mutationId: z6.string(), status: z6.literal("conflict"), serverVersion: z6.number(), serverDocument: z6.unknown() })
]);
var SyncPullQuery = z6.object({
  farmId: Id,
  since: z6.coerce.number().int().nonnegative().default(0),
  limit: z6.coerce.number().int().min(1).max(1e3).default(500)
});
var SyncChange = z6.object({
  seq: z6.number(),
  entity: z6.string(),
  entityId: z6.string(),
  op: z6.enum(["upsert", "delete"]),
  version: z6.number(),
  document: z6.unknown().optional(),
  at: z6.string()
});

// ../../packages/validation/src/schemas/daily-record.ts
import { z as z7 } from "zod";
var MortalityLine = z7.object({ cause: MortalityCause, count: PositiveCount }).strict();
var FeedLine = z7.object({
  quantityKg: Kilograms.positive(),
  /** consumption (eaten, counts in FCR) or wastage (spilled or spoiled in the house). */
  kind: FeedConsumptionKind.default("consumption"),
  /** A feed item from inventory: stock moves automatically and the feed is costed at its lots' prices. */
  feedItemId: Id.optional(),
  /** For feed not tracked in inventory: the price per kg. Not allowed together with feedItemId. */
  unitCostPerKg: Money.optional(),
  reason: OptionalText(300)
}).strict().refine((f) => !(f.feedItemId && f.unitCostPerKg), { message: "A feed item is costed from its stock; leave out unitCostPerKg", path: ["unitCostPerKg"] });
var WaterQuality = z7.object({
  source: WaterSource.optional(),
  ph: z7.number().min(0).max(14).optional(),
  tdsPpm: z7.number().nonnegative().max(1e5).optional(),
  chlorinePpm: z7.number().nonnegative().max(100).optional(),
  qualityRating: WaterQualityRating.optional(),
  treatment: WaterTreatment.optional(),
  treatmentNotes: OptionalText(300)
}).strict();
var Eggs = z7.object({
  /** Every egg gathered, including broken ones. */
  collected: Count,
  /** Broken eggs (part of collected). Removed from stock. */
  broken: Count.default(0),
  /** Unbroken eggs by grade; the sum cannot exceed collected − broken. Ungraded eggs are the remainder. */
  byGrade: z7.record(EggGrade, Count).optional(),
  averageEggWeightG: z7.number().positive().max(150).optional(),
  qualityNotes: OptionalText(500)
}).strict().refine((e) => e.broken <= e.collected, { message: "Broken eggs cannot exceed eggs collected", path: ["broken"] }).refine((e) => !e.byGrade || Object.values(e.byGrade).reduce((t, n) => t + (n ?? 0), 0) <= e.collected - e.broken, {
  message: "Graded eggs cannot exceed unbroken eggs (collected \u2212 broken)",
  path: ["byGrade"]
});
var AverageWeight = z7.object({ averageWeightG: Grams.positive(), sampleSize: PositiveCount.optional() }).strict();
var HealthObservation = z7.object({
  /** What was seen, in the farmer's words. PoultryPilot records observations; it does not diagnose. */
  signs: z7.string().trim().min(2).max(1e3),
  affectedBirds: Count.optional()
}).strict();
var Photo = z7.object({ assetId: Id, caption: OptionalText(200) }).strict();
var DailyRecordFields = z7.object({
  /** Birds counted in the house today (a headcount). Compared with the ledger; differences are shown, not applied. */
  observedBirdCount: Count.optional(),
  mortality: z7.array(MortalityLine).max(10).default([]),
  culls: Count.default(0),
  feed: z7.array(FeedLine).max(10).default([]),
  waterLitres: z7.number().nonnegative().max(1e7).optional(),
  /** Source, quality and treatment of the day's water. Needs waterLitres. */
  waterQuality: WaterQuality.optional(),
  temperatureMinC: Celsius.optional(),
  temperatureMaxC: Celsius.optional(),
  humidityPercent: z7.number().min(0).max(100).optional(),
  lightingHours: z7.number().min(0).max(24).optional(),
  eggs: Eggs.optional(),
  averageWeight: AverageWeight.optional(),
  healthObservations: z7.array(HealthObservation).max(5).default([]),
  notes: OptionalText(2e3),
  photos: z7.array(Photo).max(10).default([])
}).strict();
var tempOrder = (r) => r.temperatureMinC === void 0 || r.temperatureMaxC === void 0 || r.temperatureMinC <= r.temperatureMaxC;
var tempMsg = { message: "Minimum temperature is above the maximum", path: ["temperatureMinC"] };
var waterNeedsLitres = (r) => !r.waterQuality || r.waterLitres !== void 0;
var waterMsg = { message: "Give waterLitres with waterQuality", path: ["waterLitres"] };
var CreateDailyRecordRequest = DailyRecordFields.extend({ id: Id.optional(), flockId: Id, date: LocalDate }).strict().refine(tempOrder, tempMsg).refine(waterNeedsLitres, waterMsg);
var UpdateDailyRecordRequest = DailyRecordFields.extend({ version: z7.number().int().nonnegative() }).strict().refine(tempOrder, tempMsg).refine(waterNeedsLitres, waterMsg);
var PatchDailyRecordRequest = DailyRecordFields.partial().extend({ version: z7.number().int().nonnegative().optional() }).strict();
var UpsertDailyRecordRequest = DailyRecordFields.extend({ version: z7.number().int().nonnegative().optional() }).strict().refine(tempOrder, tempMsg).refine(waterNeedsLitres, waterMsg);
var DailyRecordListQuery = z7.object({
  date: LocalDate.optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  houseId: Id.optional(),
  flockId: Id.optional(),
  /** Flock type: broiler, layer, breeder, chick or custom. */
  type: FlockType.optional(),
  cursor: Cursor.optional(),
  limit: z7.coerce.number().int().min(1).max(200).default(50)
});
var DailyRecordSummary = z7.object({
  mortality: z7.number(),
  culls: z7.number(),
  feedKg: z7.number(),
  waterLitres: z7.number().nullable(),
  eggsCollected: z7.number().nullable(),
  eggsBroken: z7.number().nullable(),
  averageWeightG: z7.number().nullable(),
  observations: z7.number(),
  photos: z7.number()
});
var DailyRecordListItem = z7.object({
  id: z7.string(),
  flockId: z7.string(),
  flockCode: z7.string(),
  houseId: z7.string(),
  flockType: FlockType,
  date: z7.string(),
  summary: DailyRecordSummary,
  version: z7.number(),
  createdBy: z7.string(),
  updatedAt: z7.string()
});
var DailyRecordView = z7.object({
  id: z7.string().nullable(),
  flockId: z7.string(),
  flockCode: z7.string().optional(),
  houseId: z7.string().optional(),
  flockType: FlockType.optional(),
  date: z7.string(),
  observedBirdCount: z7.number().optional(),
  /** Birds alive at the end of the day according to the flock ledger. */
  birdsAliveEndOfDay: z7.number(),
  /** observedBirdCount − birdsAliveEndOfDay, when a headcount was entered. */
  countDifference: z7.number().optional(),
  /** Every death recorded for the day: from this record and from separate mortality entries. */
  mortality: z7.array(z7.object({ cause: MortalityCause, count: z7.number(), eventId: z7.string(), fromDailyRecord: z7.boolean() })),
  mortalityTotal: z7.number(),
  culls: z7.number(),
  feed: z7.array(z7.object({ id: z7.string(), kind: FeedConsumptionKind, quantityKg: z7.number(), feedItemId: z7.string().optional(), cost: Money.optional(), fromDailyRecord: z7.boolean() })),
  feedKg: z7.number(),
  waterLitres: z7.number().optional(),
  water: z7.object({
    source: WaterSource.optional(),
    ph: z7.number().optional(),
    tdsPpm: z7.number().optional(),
    chlorinePpm: z7.number().optional(),
    qualityRating: WaterQualityRating.optional(),
    treatment: WaterTreatment.optional(),
    treatmentNotes: z7.string().optional(),
    flags: z7.array(z7.string()),
    baselineLitres: z7.number().nullable()
  }).optional(),
  temperatureMinC: z7.number().optional(),
  temperatureMaxC: z7.number().optional(),
  humidityPercent: z7.number().optional(),
  lightingHours: z7.number().optional(),
  eggs: z7.object({ collected: z7.number(), broken: z7.number(), byGrade: z7.record(z7.number()).optional(), averageEggWeightG: z7.number().optional(), qualityNotes: z7.string().optional(), henDayPercent: z7.number().nullable(), withheldUntil: z7.string().optional() }).optional(),
  averageWeight: z7.object({ averageWeightG: z7.number(), sampleSize: z7.number().optional(), eventId: z7.string() }).optional(),
  healthObservations: z7.array(z7.object({ id: z7.string(), signs: z7.string(), affectedBirds: z7.number().optional() })),
  notes: z7.string().optional(),
  photos: z7.array(z7.object({ assetId: z7.string(), caption: z7.string().optional(), url: z7.string() })),
  version: z7.number().nullable(),
  createdBy: z7.string().optional(),
  createdAt: z7.string().optional(),
  updatedAt: z7.string().optional()
});
var DailyRecordMinimal = z7.object({ id: z7.string(), version: z7.number(), summary: DailyRecordSummary });
var DailyEntrySheet = z7.object({
  date: z7.string(),
  today: z7.string(),
  editWindowStart: z7.string(),
  flocks: z7.array(
    z7.object({
      flockId: z7.string(),
      flockCode: z7.string(),
      name: z7.string(),
      type: FlockType,
      houseId: z7.string(),
      houseName: z7.string(),
      expectedBirds: z7.number(),
      laying: z7.boolean(),
      record: z7.object({ id: z7.string(), version: z7.number(), summary: DailyRecordSummary, recordedByName: z7.string().nullable(), lastChangedByName: z7.string().nullable(), updatedAt: z7.string() }).nullable(),
      /** Yesterday's figures, to pre-fill or compare. */
      previous: DailyRecordSummary.nullable()
    })
  )
});
var MediaAssetView = z7.object({ id: z7.string(), contentType: z7.string(), sizeBytes: z7.number(), url: z7.string(), createdAt: z7.string() });
var DashboardDayQuery = z7.object({ date: LocalDate.optional(), houseId: Id.optional(), type: FlockType.optional() });
var DayTotals = z7.object({
  birdsAlive: z7.number(),
  mortality: z7.number(),
  culls: z7.number(),
  feedKg: z7.number(),
  waterLitres: z7.number(),
  eggsCollected: z7.number(),
  eggsBroken: z7.number(),
  henDayPercent: z7.number().nullable(),
  mortalityRatePercent: z7.number().nullable()
});
var DashboardDayView = z7.object({
  date: z7.string(),
  totals: DayTotals,
  flocksTotal: z7.number(),
  flocksRecorded: z7.number(),
  flocks: z7.array(
    DayTotals.extend({
      flockId: z7.string(),
      flockCode: z7.string(),
      type: FlockType,
      houseId: z7.string(),
      recorded: z7.boolean(),
      recordId: z7.string().nullable(),
      latestAverageWeightG: z7.number().nullable(),
      waterToFeedRatio: z7.number().nullable()
    })
  )
});
var TrendsQuery = z7.object({ from: LocalDate, to: LocalDate, flockId: Id.optional(), houseId: Id.optional(), type: FlockType.optional() }).refine((q8) => q8.from <= q8.to, { message: "from must be on or before to", path: ["from"] });
var TrendsView = z7.object({
  from: z7.string(),
  to: z7.string(),
  flockIds: z7.array(z7.string()),
  days: z7.array(z7.object({ date: z7.string(), mortality: z7.number(), culls: z7.number(), feedKg: z7.number(), waterLitres: z7.number(), eggsCollected: z7.number(), eggsBroken: z7.number(), records: z7.number() })),
  totals: z7.object({ mortality: z7.number(), culls: z7.number(), feedKg: z7.number(), waterLitres: z7.number(), eggsCollected: z7.number(), eggsBroken: z7.number(), records: z7.number() })
});

// ../../packages/validation/src/schemas/inventory.ts
import { z as z8 } from "zod";
var Quantity = z8.number().positive().max(1e8);
var FeedDetails = z8.object({ stage: FeedStage, form: z8.enum(["mash", "crumble", "pellet", "other"]).optional(), bagSizeKg: z8.number().positive().max(1e3).optional() }).strict();
var ItemFields = {
  name: NonEmptyText(120),
  sku: OptionalText(60),
  defaultSupplier: OptionalText(120),
  defaultStorageLocation: OptionalText(120),
  /** Low-stock alert at or below this quantity (in date). */
  reorderLevel: z8.number().nonnegative().max(1e8).optional(),
  /** Feed only: low-stock alert when fewer days of feed remain. */
  reorderDays: z8.number().int().min(1).max(365).optional(),
  /** Expiry alert this many days before a lot expires (default 30). */
  expiryWarningDays: z8.number().int().min(0).max(365).optional(),
  notes: OptionalText(1e3),
  feed: FeedDetails.optional()
};
var CreateInventoryItemRequest = z8.object({ id: Id.optional(), category: InventoryCategory, unit: StockUnit, medicineId: Id.optional(), ...ItemFields }).strict().refine((i) => i.category !== "feed" || i.unit === "kg" && !!i.feed, { message: "Feed items are stocked in kg and need feed details (stage)", path: ["feed"] });
var UpdateInventoryItemRequest = z8.object({ ...ItemFields, expiryWarningDays: z8.number().int().min(0).max(365), active: z8.boolean(), version: z8.number().int().nonnegative() }).strict();
var InventoryListQuery = z8.object({
  category: InventoryCategory.optional(),
  lowStock: z8.enum(["true", "false"]).transform((v) => v === "true").optional(),
  includeInactive: z8.enum(["true", "false"]).transform((v) => v === "true").optional()
});
var PurchaseRequest = z8.object({
  date: LocalDate,
  quantity: Quantity,
  unitCost: Money,
  /** A supplier from the farm's list; the purchase becomes a bill owed to them. */
  supplierId: Id.optional(),
  supplier: OptionalText(120),
  batchNumber: OptionalText(60),
  invoiceNumber: OptionalText(60),
  expiryDate: LocalDate.optional(),
  storageLocation: OptionalText(120)
}).strict().refine((p6) => !p6.expiryDate || p6.expiryDate >= p6.date, { message: "Expiry date is before the date received", path: ["expiryDate"] });
var IssueRequest = z8.object({ date: LocalDate, quantity: Quantity, flockId: Id.optional(), houseId: Id.optional(), reason: OptionalText(300) }).strict();
var WastageRequest = z8.object({ date: LocalDate, quantity: Quantity, reason: z8.string().trim().min(3).max(300) }).strict();
var StockCountRequest = z8.object({ date: LocalDate, countedQuantity: z8.number().nonnegative().max(1e8), reason: OptionalText(300) }).strict();
var LotsQuery = z8.object({ expiring: z8.enum(["true", "false"]).transform((v) => v === "true").optional(), category: InventoryCategory.optional() });
var TransactionsQuery = z8.object({ from: LocalDate.optional(), to: LocalDate.optional(), limit: z8.coerce.number().int().min(1).max(500).default(100) });
var EggMovementRequest = z8.object({
  date: LocalDate,
  type: z8.enum(["used", "spoiled", "adjustment"]),
  /** Positive for used/spoiled; signed for an adjustment (count correction). */
  quantity: z8.number().int().min(-1e7).max(1e7).refine((n) => n !== 0, "Quantity cannot be zero"),
  grade: EggGrade.optional(),
  reason: OptionalText(300)
}).strict().refine((m) => m.type === "adjustment" || m.quantity > 0, { message: "Used and spoiled quantities are positive", path: ["quantity"] });
var ReceiveChicksRequest = z8.object({ date: LocalDate, quantity: PositiveCount, species: Species.default("chicken"), breed: OptionalText(120), supplier: OptionalText(120), hatchDate: LocalDate.optional(), unitCost: Money.optional(), notes: OptionalText(1e3) }).strict();
var ChickLotsQuery = z8.object({ status: z8.enum(["available", "depleted", "closed"]).optional() });
var FeedConsumptionRequest = z8.object({
  date: LocalDate,
  quantityKg: Quantity,
  kind: FeedConsumptionKind.default("consumption"),
  /** Required for consumption; optional for wastage (omit for wastage in the store). */
  flockId: Id.optional(),
  feedItemId: Id.optional(),
  unitCostPerKg: Money.optional(),
  reason: OptionalText(300)
}).strict().refine((f) => f.kind === "wastage" || !!f.flockId, { message: "Feed eaten must name the flock", path: ["flockId"] }).refine((f) => !(f.feedItemId && f.unitCostPerKg), { message: "A feed item is costed from its stock; leave out unitCostPerKg", path: ["unitCostPerKg"] });
var FeedListQuery = z8.object({
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  flockId: Id.optional(),
  feedItemId: Id.optional(),
  kind: FeedConsumptionKind.optional(),
  limit: z8.coerce.number().int().min(1).max(500).default(100)
});
var FeedAnalyticsQuery = z8.object({ flockId: Id.optional(), status: FlockStatus.optional(), asOf: LocalDate.optional() });
var WaterListQuery = z8.object({
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  flockId: Id.optional(),
  abnormal: z8.enum(["true", "false"]).transform((v) => v === "true").optional(),
  limit: z8.coerce.number().int().min(1).max(500).default(100)
});

// ../../packages/validation/src/schemas/health.ts
import { z as z9 } from "zod";
var Days = z9.number().int().min(0).max(365);
var Attachment = z9.object({ assetId: Id, name: OptionalText(200) }).strict();
var MedicineFields = {
  name: NonEmptyText(120),
  type: MedicineType,
  activeIngredient: OptionalText(200),
  manufacturer: OptionalText(120),
  defaultRoute: AdministrationRoute.optional(),
  doseUnit: StockUnit.optional(),
  /** From the product label or the farm's veterinarian. PoultryPilot has no country defaults. */
  withdrawalMeatDays: Days.optional(),
  withdrawalEggDays: Days.optional(),
  withdrawalSource: WithdrawalSource.optional(),
  prescriptionRequired: z9.boolean().optional(),
  label: z9.object({ name: NonEmptyText(200), url: z9.string().url().max(1e3).optional() }).strict().optional(),
  notes: OptionalText(1e3)
};
var CreateMedicineRequest = z9.object({ id: Id.optional(), ...MedicineFields }).strict();
var UpdateMedicineRequest = z9.object({ ...MedicineFields, version: z9.number().int().nonnegative() }).strict();
var TreatmentInput = z9.object({
  medicineId: Id.optional(),
  /** For a product not in the catalog. */
  medicineName: OptionalText(120),
  /** Draw the quantity from this inventory item's stock (FEFO, expired stock refused). */
  inventoryItemId: Id.optional(),
  quantityUsed: z9.number().positive().max(1e8).optional(),
  /** As instructed, e.g. "1 g per 2 L drinking water". */
  dose: OptionalText(120),
  route: AdministrationRoute.optional(),
  frequency: OptionalText(120),
  startDate: LocalDate,
  durationDays: z9.number().int().min(1).max(365),
  /** Override the medicine's default withdrawal periods (e.g. on veterinary instruction). */
  withdrawalMeatDays: Days.optional(),
  withdrawalEggDays: Days.optional(),
  withdrawalSource: WithdrawalSource.optional(),
  prescribedBy: OptionalText(120),
  prescriptionReference: OptionalText(80)
}).strict().refine((t) => !!t.medicineId || !!t.medicineName, { message: "Name the medicine (medicineId or medicineName)", path: ["medicineName"] }).refine((t) => !t.inventoryItemId || t.quantityUsed !== void 0, { message: "Give quantityUsed to draw from stock", path: ["quantityUsed"] });
var HealthRecordFields = z9.object({
  type: HealthRecordType,
  date: LocalDate,
  flockId: Id.optional(),
  houseId: Id.optional(),
  title: NonEmptyText(200),
  symptoms: z9.array(z9.string().trim().min(2).max(60)).max(20).optional(),
  observedSigns: OptionalText(2e3),
  affectedBirds: Count.optional(),
  deadBirds: Count.optional(),
  vetName: OptionalText(120),
  /** A diagnosis or assessment, attributed to the veterinarian, laboratory or staff member who made it. */
  assessment: z9.object({ text: z9.string().trim().min(2).max(2e3), by: NonEmptyText(120), source: AssessmentSource }).strict().optional(),
  lab: z9.object({ name: OptionalText(120), reference: OptionalText(60), result: OptionalText(4e3) }).strict().optional(),
  treatments: z9.array(TreatmentInput).max(5).default([]),
  cost: Money.optional(),
  followUpDate: LocalDate.optional(),
  attachments: z9.array(Attachment).max(10).default([])
}).strict();
var treatmentsOnlyFor = (r) => r.treatments.length === 0 || r.type === "treatment" || r.type === "vet_visit";
var treatMsg = { message: "Treatments belong to treatment or vet visit records", path: ["treatments"] };
var CreateHealthRecordRequest = HealthRecordFields.extend({ id: Id.optional() }).strict().refine(treatmentsOnlyFor, treatMsg);
var UpdateHealthRecordRequest = HealthRecordFields.extend({ version: z9.number().int().nonnegative() }).strict().refine(treatmentsOnlyFor, treatMsg);
var HealthRecordListQuery = z9.object({
  flockId: Id.optional(),
  type: HealthRecordType.optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  cursor: Cursor.optional(),
  limit: z9.coerce.number().int().min(1).max(200).default(50)
});
var ProgrammeItem = z9.object({ dayOfAge: z9.number().int().min(0).max(2e3), vaccineName: NonEmptyText(120), medicineId: Id.optional(), targetDisease: OptionalText(120), route: AdministrationRoute.optional(), notes: OptionalText(300) }).strict();
var ProgrammeFields = {
  name: NonEmptyText(120),
  flockTypes: z9.array(FlockType).max(5).optional(),
  items: z9.array(ProgrammeItem).min(1).max(60),
  /** Where the programme came from: the farm's veterinarian, the hatchery, a written plan. */
  source: OptionalText(300)
};
var CreateProgrammeRequest = z9.object({ id: Id.optional(), ...ProgrammeFields }).strict();
var UpdateProgrammeRequest = z9.object({ ...ProgrammeFields, active: z9.boolean(), version: z9.number().int().nonnegative() }).strict();
var ApplyProgrammeRequest = z9.object({ programmeId: Id, includePast: z9.boolean().default(false) }).strict();
var ScheduleVaccinationRequest = z9.object({ flockId: Id, vaccineName: NonEmptyText(120), medicineId: Id.optional(), targetDisease: OptionalText(120), dueDate: LocalDate, route: AdministrationRoute.optional(), notes: OptionalText(1e3) }).strict();
var AdministerVaccinationRequest = z9.object({
  date: LocalDate,
  administeredBy: OptionalText(120),
  route: AdministrationRoute.optional(),
  birdsVaccinated: PositiveCount.optional(),
  /** Draw doses from this vaccine's stock: batches and expiry are recorded from the lots used. */
  inventoryItemId: Id.optional(),
  dosesUsed: z9.number().positive().max(1e8).optional(),
  /** For vaccine not tracked in inventory: the batch numbers and expiry dates used. */
  batches: z9.array(z9.object({ batchNumber: NonEmptyText(60), expiryDate: LocalDate.optional(), doses: z9.number().positive().optional() }).strict()).max(5).optional(),
  notes: OptionalText(1e3)
}).strict().refine((v) => !v.inventoryItemId || v.dosesUsed !== void 0, { message: "Give dosesUsed to draw from stock", path: ["dosesUsed"] }).refine((v) => !(v.inventoryItemId && v.batches), { message: "Batches come from the stock lots; leave out batches", path: ["batches"] });
var SkipVaccinationRequest = z9.object({ reason: z9.string().trim().min(3).max(500) }).strict();
var VaccinationListQuery = z9.object({
  flockId: Id.optional(),
  state: z9.enum(["scheduled", "due", "overdue", "done", "skipped", "cancelled"]).optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional()
});
var RemindersQuery = z9.object({ days: z9.coerce.number().int().min(1).max(90).default(14) });

// ../../packages/validation/src/schemas/biosecurity.ts
import { z as z10 } from "zod";
var ChecklistItem = z10.object({
  id: z10.string().trim().regex(/^[a-z0-9_]{1,60}$/, "Use lowercase letters, digits and _"),
  text: NonEmptyText(300),
  required: z10.boolean().default(true),
  responseType: ChecklistResponseType,
  choices: z10.array(NonEmptyText(60)).min(2).max(20).optional(),
  /** The answer that counts as a failed check: "yes", "no", or one of the choices. */
  failIf: z10.string().trim().max(60).optional(),
  createActionOnFail: z10.boolean().default(true)
}).strict().refine((i) => i.responseType !== "choice" || !!i.choices, { message: "Choice items need choices", path: ["choices"] }).refine((i) => i.failIf === void 0 || (i.responseType === "yes_no" ? ["yes", "no"].includes(i.failIf) : i.responseType === "choice" ? !!i.choices?.includes(i.failIf) : false), {
  message: "failIf must be yes/no for yes-no items or one of the choices",
  path: ["failIf"]
});
var TemplateFields = {
  name: NonEmptyText(120),
  kind: ChecklistKind,
  items: z10.array(ChecklistItem).min(1).max(60).refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Item ids must be unique"),
  source: OptionalText(300)
};
var CreateChecklistTemplateRequest = z10.object({ id: Id.optional(), ...TemplateFields }).strict();
var UpdateChecklistTemplateRequest = z10.object({ ...TemplateFields, active: z10.boolean(), version: z10.number().int().nonnegative() }).strict();
var ChecklistTemplateQuery = z10.object({ kind: ChecklistKind.optional() });
var ChecklistAnswers = z10.object({ templateId: Id, answers: z10.array(z10.object({ itemId: z10.string().max(60), answer: z10.union([z10.string().max(300), z10.number(), z10.boolean()]) }).strict()).max(60) }).strict();
var VisitorCheckInRequest = z10.object({
  name: NonEmptyText(120),
  company: OptionalText(120),
  type: VisitorType,
  phone: OptionalText(30),
  purpose: OptionalText(200),
  vehicleRegistration: OptionalText(30),
  housesVisited: z10.array(Id).max(20).optional(),
  /** Asked of every visitor: contact with other poultry, and when. */
  previousPoultryContact: z10.object({ hadContact: z10.boolean(), lastContactAt: Instant.optional(), description: OptionalText(300) }).strict(),
  declaration: z10.object({ declaredName: NonEmptyText(120), signatureAssetId: Id.optional(), checklist: ChecklistAnswers.optional() }).strict().optional(),
  ppeUsed: z10.array(NonEmptyText(60)).max(20).optional(),
  footbathUsed: z10.boolean().default(false),
  disinfected: z10.boolean().default(false),
  checkInAt: Instant.optional(),
  notes: OptionalText(1e3)
}).strict().refine((v) => !v.previousPoultryContact.hadContact || !!v.previousPoultryContact.lastContactAt, { message: "Give the time of the last poultry contact", path: ["previousPoultryContact", "lastContactAt"] });
var VisitorCheckOutRequest = z10.object({ checkOutAt: Instant.optional() }).strict();
var VisitorListQuery = z10.object({ from: LocalDate.optional(), to: LocalDate.optional(), flagged: z10.enum(["true", "false"]).transform((v) => v === "true").optional() });
var ProductUsed = z10.object({ inventoryItemId: Id.optional(), name: OptionalText(120), quantityUsed: z10.number().positive().max(1e8).optional(), concentration: OptionalText(60) }).strict();
var BiosecurityLogRequest = z10.object({
  type: BiosecurityEntryType,
  date: LocalDate,
  houseId: Id.optional(),
  cleaningTaskId: Id.optional(),
  performedBy: OptionalText(120),
  product: ProductUsed.optional(),
  footbath: z10.object({ action: z10.enum(["changed", "checked", "topped_up"]), disinfectant: OptionalText(120), concentration: OptionalText(60) }).strict().optional(),
  vehicle: z10.object({ registration: NonEmptyText(30), driver: OptionalText(120), company: OptionalText(120), purpose: OptionalText(200), disinfected: z10.boolean().default(false), entryAt: Instant.optional(), exitAt: Instant.optional(), lastPoultryContactAt: Instant.optional() }).strict().optional(),
  pest: z10.object({ pestType: PestType, method: OptionalText(120), stationsChecked: Count.optional(), activityFound: z10.boolean().default(false) }).strict().optional(),
  wildBird: z10.object({ description: NonEmptyText(200), count: Count.optional(), location: OptionalText(200), contactWithPoultry: z10.boolean().default(false), contactWithFeedOrWater: z10.boolean().default(false), deadWildBirdsFound: Count.optional() }).strict().optional(),
  checklist: ChecklistAnswers.optional(),
  attachments: z10.array(z10.object({ assetId: Id, name: OptionalText(200) }).strict()).max(10).default([]),
  details: OptionalText(2e3)
}).strict().refine((l) => l.type !== "footbath" || !!l.footbath, { message: "Footbath entries need the footbath section", path: ["footbath"] }).refine((l) => l.type !== "vehicle" || !!l.vehicle, { message: "Vehicle entries need the vehicle section", path: ["vehicle"] }).refine((l) => l.type !== "pest_control" || !!l.pest, { message: "Pest control entries need the pest section", path: ["pest"] }).refine((l) => l.type !== "wild_bird_observation" || !!l.wildBird, { message: "Wild bird observations need the wildBird section", path: ["wildBird"] }).refine((l) => !l.product?.inventoryItemId || l.product.quantityUsed !== void 0, { message: "Give quantityUsed to draw the product from stock", path: ["product", "quantityUsed"] });
var BiosecurityLogQuery = z10.object({ type: BiosecurityEntryType.optional(), houseId: Id.optional(), from: LocalDate.optional(), to: LocalDate.optional(), limit: z10.coerce.number().int().min(1).max(500).default(100) });
var EquipmentRequest = z10.object({ id: Id.optional(), name: NonEmptyText(120), type: EquipmentType, serialNumber: OptionalText(80), houseId: Id.optional(), status: EquipmentStatus.default("in_service"), nextMaintenanceDate: LocalDate.optional(), notes: OptionalText(1e3) }).strict();
var EquipmentMoveRequest = z10.object({ date: LocalDate, toHouseId: Id.optional(), offFarmDestination: OptionalText(200), disinfected: z10.boolean(), movedBy: OptionalText(120), note: OptionalText(500) }).strict().refine((m) => !!m.toHouseId !== !!m.offFarmDestination, { message: "Give either toHouseId or offFarmDestination", path: ["toHouseId"] });
var CleaningScheduleRequest = z10.object({
  title: NonEmptyText(200),
  activity: z10.enum(["cleaning", "disinfection"]).default("cleaning"),
  schedule: CleaningSchedule,
  houseIds: z10.array(Id).max(50).optional(),
  checklistTemplateId: Id.optional(),
  assigneeUserId: Id.optional(),
  nextDueDate: LocalDate.optional(),
  notes: OptionalText(1e3)
}).strict();
var CompleteCleaningRequest = z10.object({ date: LocalDate, houseId: Id.optional(), performedBy: OptionalText(120), product: ProductUsed.optional(), checklist: ChecklistAnswers.optional(), details: OptionalText(2e3) }).strict();
var CorrectiveActionRequest = z10.object({ title: NonEmptyText(200), description: OptionalText(2e3), assigneeUserId: Id.optional(), dueDate: LocalDate.optional(), priority: TaskPriority.default("normal"), houseId: Id.optional(), flockId: Id.optional() }).strict();
var CompleteActionRequest = z10.object({ resolutionNotes: z10.string().trim().min(3).max(2e3) }).strict();
var ActionListQuery = z10.object({ status: TaskStatus.optional(), kind: z10.enum(["corrective_action", "follow_up", "general"]).default("corrective_action") });

// ../../packages/validation/src/schemas/hatchery.ts
import { z as z11 } from "zod";
var CreateHatcheryBatchRequest = z11.object({
  id: Id.optional(),
  code: z11.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._\-/ ]+$/, "Letters, digits, spaces and . _ - / only"),
  species: Species.default("chicken"),
  breed: OptionalText(120),
  eggSource: z11.enum(["own_flock", "purchased"]),
  sourceFlockId: Id.optional(),
  /** Own-flock eggs are drawn from this egg grade in stock (default: ungraded). */
  eggGrade: EggGrade.optional(),
  supplier: OptionalText(120),
  eggsReceived: PositiveCount,
  /** Eggs not set at selection, by reason. */
  rejects: z11.record(z11.enum(EGG_REJECT_REASONS), Count).optional(),
  setDate: LocalDate,
  /** Defaults to the species' typical period (chicken 21, duck and turkey 28, quail 17, guinea fowl 27). */
  incubationDays: z11.number().int().min(10).max(40).optional(),
  incubatorId: Id.optional(),
  eggCost: Money.optional(),
  otherCost: Money.optional(),
  notes: OptionalText(1e3)
}).strict().refine((b) => b.eggSource !== "own_flock" || !!b.sourceFlockId, { message: "Name the flock the eggs came from", path: ["sourceFlockId"] });
var CandlingRequest = z11.object({ date: LocalDate, infertile: Count.default(0), deadEmbryo: Count.default(0), cracked: Count.default(0), note: OptionalText(500) }).strict();
var TransferToHatcherRequest = z11.object({ date: LocalDate, cracked: Count.default(0), deadEmbryo: Count.default(0), hatcherId: Id.optional(), note: OptionalText(500) }).strict();
var HatchRequest = z11.object({ date: LocalDate, hatched: Count, deadInShell: Count.optional(), note: OptionalText(500) }).strict();
var GradingRequest = z11.object({ date: LocalDate, saleable: Count, culled: Count.default(0), note: OptionalText(500) }).strict();
var MachineReadingRequest = z11.object({ date: LocalDate, machine: z11.enum(["setter", "hatcher"]), temperatureC: z11.number().min(0).max(50).optional(), humidityPercent: z11.number().min(0).max(100).optional(), note: OptionalText(500) }).strict().refine((r) => r.temperatureC !== void 0 || r.humidityPercent !== void 0 || !!r.note, { message: "Give a reading or a note", path: ["note"] });
var ReasonRequest = z11.object({ reason: z11.string().trim().min(3).max(300) }).strict();
var BatchListQuery = z11.object({ status: z11.enum(HATCHERY_BATCH_STATUSES).optional() });
var HatcherySummaryQuery = z11.object({ from: LocalDate.optional(), to: LocalDate.optional() });
var BuyerRequest = z11.object({ name: NonEmptyText(120), type: z11.enum(["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"]).default("other"), phone: OptionalText(30), email: z11.string().email().max(254).optional(), locationLabel: OptionalText(200), notes: OptionalText(1e3) }).strict();
var ChickOrderRequest = z11.object({
  buyerId: Id,
  quantity: PositiveCount,
  unitPrice: Money,
  requestedDeliveryDate: LocalDate.optional(),
  /** Order from chicks in stock... */
  chickLotId: Id.optional(),
  /** ...or book against a batch still incubating. */
  hatcheryBatchId: Id.optional(),
  deliveryAddress: OptionalText(300),
  fulfilment: z11.enum(FULFILMENT_METHODS).default("pickup"),
  notes: OptionalText(1e3)
}).strict().refine((o) => !!o.chickLotId !== !!o.hatcheryBatchId, { message: "Give either chickLotId or hatcheryBatchId", path: ["chickLotId"] });
var DeliverOrderRequest = z11.object({ date: LocalDate, chickLotId: Id.optional() }).strict();
var OrderListQuery = z11.object({ status: z11.enum(ORDER_STATUSES).optional(), from: LocalDate.optional(), to: LocalDate.optional() });
var Band = z11.object({
  fromDay: z11.number().int().min(0).max(120),
  toDay: z11.number().int().min(0).max(120),
  tempMinC: z11.number().min(0).max(45).optional(),
  tempMaxC: z11.number().min(0).max(45).optional(),
  humidityMin: z11.number().min(0).max(100).optional(),
  humidityMax: z11.number().min(0).max(100).optional(),
  targetWeightG: z11.number().positive().max(1e4).optional()
}).strict();
var BroodingProfileRequest = z11.object({
  name: NonEmptyText(120),
  flockTypes: z11.array(FlockType).max(5).optional(),
  bands: z11.array(Band).min(1).max(60),
  /** Where the targets come from: the breed's management guide or the farm's veterinarian. */
  source: OptionalText(300),
  isDefault: z11.boolean().default(false)
}).strict();
var PlanArrivalRequest = z11.object({
  houseId: Id,
  expectedDate: LocalDate,
  expectedCount: PositiveCount,
  source: z11.enum(["own_hatchery", "chick_lot", "supplier"]),
  hatcheryBatchId: Id.optional(),
  chickLotId: Id.optional(),
  supplier: OptionalText(120),
  flockType: FlockType,
  breed: OptionalText(120),
  broodingProfileId: Id.optional(),
  notes: OptionalText(1e3)
}).strict();
var ArrivalListQuery = z11.object({ status: z11.enum(ARRIVAL_STATUSES).optional() });
var PreparationRequest = z11.object({ checklist: ChecklistAnswers }).strict();
var ArriveRequest = z11.object({
  arrivedAt: Instant.optional(),
  received: PositiveCount,
  deadOnArrival: Count.default(0),
  averageWeightG: z11.number().positive().max(200).optional(),
  sampleSize: PositiveCount.optional(),
  qualityNotes: OptionalText(500),
  checklist: ChecklistAnswers.optional(),
  flock: z11.object({ name: NonEmptyText(120), flockCode: z11.string().trim().min(1).max(40), chickCost: Money.optional() }).strict()
}).strict().refine((a) => a.deadOnArrival <= a.received, { message: "Dead on arrival cannot exceed chicks received", path: ["deadOnArrival"] });
var BrooderCheckRequest = z11.object({
  flockId: Id,
  checkedAt: Instant.optional(),
  /** Measured at chick height. */
  temperatureC: z11.number().min(-10).max(60).optional(),
  humidityPercent: z11.number().min(0).max(100).optional(),
  behaviour: z11.enum(BROODER_BEHAVIOURS).optional(),
  feedAvailable: z11.boolean().optional(),
  waterAvailable: z11.boolean().optional(),
  cropFill: z11.object({ sampled: PositiveCount, full: Count }).strict().optional(),
  checklist: ChecklistAnswers.optional(),
  notes: OptionalText(1e3)
}).strict();
var BroodingViewQuery = z11.object({ days: z11.coerce.number().int().min(1).max(60).default(14) });
var CalendarQuery = z11.object({
  from: LocalDate,
  to: LocalDate,
  types: z11.string().optional().transform((v) => v ? v.split(",").map((t) => t.trim()).filter(Boolean) : void 0).pipe(z11.array(z11.enum(["transfer_expected", "hatch_expected", "chick_delivery", "chick_arrival", "vaccination_due", "cleaning_due", "health_follow_up"])).optional())
}).refine((q8) => q8.from <= q8.to, { message: "from must be on or before to", path: ["from"] });

// ../../packages/validation/src/schemas/finance.ts
import { z as z12 } from "zod";
var PaymentMethod2 = z12.enum(PAYMENT_METHODS);
var Attachment2 = z12.object({ assetId: Id, name: OptionalText(200) }).strict();
var Tax = z12.object({ ratePercent: z12.number().min(0).max(100), inclusive: z12.boolean(), label: OptionalText(30) }).strict();
var PaidNow = z12.object({ accountId: Id, method: PaymentMethod2, reference: OptionalText(80) }).strict();
var SupplierRequest = z12.object({ name: NonEmptyText(120), phone: OptionalText(30), email: z12.string().email().max(254).optional(), taxId: OptionalText(40), address: OptionalText(300), notes: OptionalText(1e3) }).strict();
var MoneyAccountRequest = z12.object({ name: NonEmptyText(80), type: z12.enum(MONEY_ACCOUNT_TYPES), openingBalance: Money, openingDate: LocalDate, notes: OptionalText(500) }).strict();
var DocFields = {
  date: LocalDate,
  dueDate: LocalDate.optional(),
  description: NonEmptyText(300),
  /** Amount entered: with `tax.inclusive` it includes tax, otherwise tax is added on top. */
  amount: Money,
  tax: Tax.optional(),
  flockId: Id.optional(),
  houseId: Id.optional(),
  invoiceNumber: OptionalText(60),
  attachments: z12.array(Attachment2).max(10).optional(),
  notes: OptionalText(1e3),
  paidNow: PaidNow.optional()
};
var ExpenseRequest = z12.object({
  ...DocFields,
  kind: z12.enum(EXPENSE_KINDS).default("expense"),
  category: z12.enum(EXPENSE_CATEGORIES),
  supplierId: Id.optional(),
  vendor: OptionalText(120),
  /** Save even though a bill with the same amount exists within 3 days (after the person has checked it). */
  allowDuplicate: z12.boolean().optional()
}).strict();
var IncomeRequest = z12.object({ ...DocFields, kind: z12.enum(INCOME_KINDS).default("income"), category: z12.enum(INCOME_CATEGORIES), buyerId: Id.optional(), customerName: OptionalText(120) }).strict();
var DocumentListQuery = z12.object({
  status: z12.enum(EXPENSE_STATUSES).optional(),
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  flockId: Id.optional(),
  houseId: Id.optional(),
  limit: z12.coerce.number().int().min(1).max(500).default(100)
});
var PaymentRequest = z12.object({ date: LocalDate, amount: Money, accountId: Id, method: PaymentMethod2, reference: OptionalText(80), note: OptionalText(300) }).strict();
var RefundRequest = z12.object({ date: LocalDate, amount: Money, accountId: Id, method: PaymentMethod2, reason: z12.string().trim().min(3).max(300) }).strict();
var TransferRequestMoney = z12.object({ date: LocalDate, fromAccountId: Id, toAccountId: Id, amount: Money, reference: OptionalText(80), description: OptionalText(300) }).strict();
var LedgerQuery = z12.object({ accountId: Id.optional(), from: LocalDate.optional(), to: LocalDate.optional(), limit: z12.coerce.number().int().min(1).max(1e3).default(200) });
var RecurringExpenseRequest = z12.object({
  name: NonEmptyText(120),
  category: z12.enum(EXPENSE_CATEGORIES),
  supplierId: Id.optional(),
  vendor: OptionalText(120),
  amount: Money,
  tax: Tax.optional(),
  frequency: z12.enum(RECURRING_FREQUENCIES),
  startDate: LocalDate,
  endDate: LocalDate.optional(),
  flockId: Id.optional(),
  houseId: Id.optional(),
  notes: OptionalText(1e3)
}).strict();
var PauseRequest = z12.object({ from: LocalDate, to: LocalDate.optional() }).strict();
var PeriodQuery = z12.object({ from: LocalDate, to: LocalDate, flockId: Id.optional(), houseId: Id.optional() }).refine((q8) => q8.from <= q8.to, { message: "from must be on or before to", path: ["from"] });
var OptionalPeriodQuery = z12.object({ from: LocalDate.optional(), to: LocalDate.optional() });
var ProfitabilityQuery = z12.object({ status: z12.enum(FLOCK_STATUSES).optional(), flockId: Id.optional() });
var ListingRequest = z12.object({
  title: NonEmptyText(150),
  category: z12.enum(LISTING_CATEGORIES),
  product: z12.enum(MARKET_PRODUCTS).optional(),
  description: OptionalText(2e3),
  quantityAvailable: z12.number().positive().max(1e8),
  minOrderQuantity: z12.number().positive().max(1e8).optional(),
  unit: z12.string().trim().min(1).max(20),
  /** Price per unit; buyers always pay this price. */
  price: Money,
  priceUnit: z12.enum(PRICE_UNITS),
  /** Defaults to the farm's country. */
  regionCode: z12.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/, "Country code, optionally with region (e.g. IN or IN-UP)").optional(),
  locationLabel: OptionalText(200),
  availableFrom: LocalDate.optional(),
  availableUntil: LocalDate.optional(),
  fulfilmentOptions: z12.array(z12.enum(FULFILMENT_METHODS)).min(1).max(3),
  photos: z12.array(Id).max(10).optional(),
  /** Link to stock so delivery moves it: eggs (grade), a chick lot, or a flock (live birds). */
  source: z12.object({ kind: z12.enum(["eggs", "chick_lot", "flock"]), eggGrade: z12.enum(EGG_GRADES).optional(), chickLotId: Id.optional(), flockId: Id.optional() }).strict().optional()
}).strict().refine((l) => !l.minOrderQuantity || l.minOrderQuantity <= l.quantityAvailable, { message: "Minimum order exceeds the quantity available", path: ["minOrderQuantity"] });
var UpdateListingRequest = ListingRequest.innerType().extend({ version: z12.number().int().nonnegative() }).strict();
var ListingStatusRequest = z12.object({ status: z12.enum(["active", "paused", "closed"]) }).strict();
var MyListingsQuery = z12.object({ status: z12.enum(LISTING_STATUSES).optional() });
var BrowseQuery = z12.object({
  category: z12.enum(LISTING_CATEGORIES).optional(),
  region: z12.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/).optional(),
  q: z12.string().trim().max(80).optional(),
  limit: z12.coerce.number().int().min(1).max(100).default(50)
});
var PlaceOrderRequest = z12.object({
  listingId: Id,
  quantity: z12.number().positive().max(1e8),
  fulfilment: z12.enum(FULFILMENT_METHODS),
  deliveryAddress: OptionalText(300),
  /** Defaults to the signed-in person's name. */
  buyerName: NonEmptyText(120).optional(),
  buyerPhone: OptionalText(30),
  /** Buying for one of your farms. */
  buyerFarmId: Id.optional(),
  notes: OptionalText(1e3)
}).strict();
var OrderListQueryMarket = z12.object({ status: z12.enum(ORDER_STATUSES).optional(), channel: z12.enum(["direct", "marketplace"]).optional() });
var DispatchRequest = z12.object({ expectedDate: LocalDate.optional(), vehicle: OptionalText(60), driver: OptionalText(120), trackingReference: OptionalText(80) }).strict();
var DeliveredRequest = z12.object({ date: LocalDate.optional(), receivedBy: OptionalText(120), proofAssetId: Id.optional() }).strict();
var BuyerUpdateRequest = z12.object({ name: NonEmptyText(120), type: z12.enum(["trader", "retailer", "restaurant", "processor", "individual", "farm", "other"]), phone: OptionalText(30), email: z12.string().email().max(254).optional(), locationLabel: OptionalText(200), notes: OptionalText(1e3), version: z12.number().int().nonnegative() }).strict();

// ../../packages/validation/src/schemas/intelligence.ts
import { z as z13 } from "zod";
var RuleKey = z13.enum(RULE_KEYS);
var Severity = z13.enum(ALERT_SEVERITIES);
var AlertRuleUpdateRequest = z13.object({
  enabled: z13.boolean(),
  /** Parameter values from the rule's catalog entry (GET /alert-rules lists them with ranges). */
  parameters: z13.record(z13.string().max(40), z13.number()).optional(),
  severity: Severity.optional(),
  channels: z13.array(z13.enum(["in_app", "push", "email"])).min(1).max(3).optional(),
  notifyRoles: z13.array(z13.enum(ROLES)).min(1).max(7).optional(),
  cooldownHours: z13.number().int().min(0).max(720).optional(),
  flockIds: z13.array(Id).max(100).optional(),
  houseIds: z13.array(Id).max(100).optional()
}).strict();
var AlertsQuery = z13.object({
  status: z13.enum(ALERT_STATUSES).optional(),
  ruleType: z13.enum(ALERT_RULE_TYPES).optional(),
  ruleKey: RuleKey.optional(),
  severity: Severity.optional(),
  flockId: Id.optional(),
  limit: z13.coerce.number().int().min(1).max(200).default(50)
});
var AnalyticsQuery = z13.object({ from: LocalDate, to: LocalDate, flockId: Id.optional(), type: z13.enum(FLOCK_TYPES).optional() }).refine((q8) => q8.from <= q8.to, { message: "from must be on or before to", path: ["from"] });
var WeatherQuery = z13.object({ historyDays: z13.coerce.number().int().min(1).max(365).optional() });
var NotificationListQuery = z13.object({
  unreadOnly: z13.enum(["true", "false"]).transform((v) => v === "true").optional(),
  limit: z13.coerce.number().int().min(1).max(200).default(50)
});
var MarkReadRequest = z13.object({ ids: z13.array(Id).min(1).max(200) }).strict();
var PushDeviceRequest = z13.object({ platform: z13.enum(PUSH_PLATFORMS), token: z13.string().min(10).max(4096), deviceName: OptionalText(100) }).strict();
var HHMM = z13.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");
var NotificationCategoryPrefs = z13.record(z13.enum(NOTIFICATION_CATEGORIES), z13.object({ push: z13.boolean().optional(), email: z13.boolean().optional() }).strict());
var NotificationPreferencesRequest = z13.object({
  pushEnabled: z13.boolean(),
  emailEnabled: z13.boolean(),
  pushMinSeverity: Severity,
  emailMinSeverity: Severity,
  mutedRuleKeys: z13.array(RuleKey).max(14).optional(),
  categories: NotificationCategoryPrefs.optional(),
  /** Push waits until the end of quiet hours (critical alerts still go through). null turns quiet hours off. */
  quietHours: z13.object({ start: HHMM, end: HHMM, timezone: z13.string().min(1).max(60) }).strict().nullable().optional()
}).strict();
var AppointmentRequest = z13.object({ date: LocalDate, title: NonEmptyText(200), vetName: OptionalText(120), flockId: Id.optional(), houseId: Id.optional(), notes: OptionalText(1e3) }).strict();
var AppointmentListQuery = z13.object({ includeDone: z13.enum(["true", "false"]).transform((v) => v === "true").optional() });
var CompleteAppointmentRequest = z13.object({ notes: OptionalText(1e3) }).strict();

// ../../packages/validation/src/schemas/content.ts
import { z as z14 } from "zod";
var Region = z14.string().regex(/^(GLOBAL|[A-Z]{2}(-[A-Z0-9]{1,3})?)$/, "GLOBAL, a country code (IN) or a region (IN-UP)");
var Locale = z14.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default("en");
var Slug = z14.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words separated by hyphens").max(120);
var Url = z14.string().url().max(2e3).refine((u) => /^https?:\/\//.test(u), "http or https only");
var Reference = z14.object({ name: NonEmptyText(300), url: Url.optional() }).strict();
var Category = z14.enum(CONTENT_CATEGORIES);
var Kind = z14.enum(ARTICLE_KINDS);
var Limit = (d) => z14.coerce.number().int().min(1).max(200).default(d);
var ContentArticleQuery = z14.object({ kind: Kind.optional(), category: Category.optional(), region: Region.optional(), q: z14.string().trim().max(80).optional(), locale: Locale, limit: Limit(50) });
var NewsQuery = z14.object({ category: Category.optional(), region: Region.optional(), locale: Locale, limit: Limit(20) });
var FactQuery = z14.object({ region: Region.optional(), locale: Locale });
var GlossaryQuery = z14.object({ q: z14.string().trim().max(80).optional(), category: z14.string().max(60).optional(), region: Region.optional(), locale: Locale, limit: Limit(100) });
var CourseQuery = z14.object({ category: Category.optional(), region: Region.optional(), locale: Locale });
var LocaleQuery = z14.object({ locale: Locale });
var ArticleListQuery = z14.object({ kind: Kind.optional(), tag: z14.string().max(40).optional(), region: Region.optional(), locale: Locale });
var ArticleRequest = z14.object({
  kind: Kind,
  origin: z14.enum(ARTICLE_ORIGINS).default("original"),
  slug: Slug,
  locale: Locale,
  title: NonEmptyText(200),
  summary: OptionalText(600),
  content: z14.string().max(5e4).optional(),
  category: Category,
  author: OptionalText(120),
  source: OptionalText(160),
  sourceUrl: Url.optional(),
  publicationDate: LocalDate.optional(),
  regionCode: Region.default("GLOBAL"),
  tags: z14.array(z14.string().trim().toLowerCase().max(40)).max(20).optional(),
  disease: z14.object({ species: z14.array(z14.string().max(40)).max(10).optional(), signs: z14.array(z14.string().max(200)).max(30).optional(), transmission: OptionalText(2e3), prevention: OptionalText(2e3), reportingNote: OptionalText(500) }).strict().optional(),
  sources: z14.array(Reference).max(20).optional()
}).strict().refine((a) => a.origin !== "external" || !!a.source && !!a.sourceUrl, { message: "External articles need source and sourceUrl", path: ["sourceUrl"] }).refine((a) => !a.disease || a.kind === "disease", { message: "Disease details belong on disease articles", path: ["disease"] });
var UpdateArticleRequest = ArticleRequest.innerType().innerType().extend({ version: z14.number().int().nonnegative() }).strict();
var EditorArticleQuery = z14.object({ status: z14.enum(CONTENT_STATUSES).optional(), kind: Kind.optional(), q: z14.string().trim().max(80).optional(), limit: Limit(50) });
var RejectRequest = z14.object({ reason: z14.string().trim().min(3).max(500) }).strict();
var ImportRequest = z14.object({
  kind: Kind.default("news"),
  items: z14.array(z14.object({ title: NonEmptyText(300), summary: z14.string().max(5e3).optional(), sourceUrl: Url, publicationDate: LocalDate.optional(), author: OptionalText(120), source: NonEmptyText(160), regionCode: Region.default("GLOBAL"), category: Category.default("general") }).strict()).min(1).max(200)
}).strict();
var GlossaryRequest = z14.object({ slug: Slug, locale: Locale, term: NonEmptyText(120), definition: z14.string().trim().min(1).max(2e3), category: NonEmptyText(60), relatedSlugs: z14.array(Slug).max(20).optional(), regionCode: Region.default("GLOBAL"), status: z14.enum(["draft", "published"]).default("draft"), sources: z14.array(Reference).max(10).default([]), version: z14.number().int().nonnegative().optional() }).strict();
var CourseRequest = z14.object({
  slug: Slug,
  locale: Locale,
  title: NonEmptyText(150),
  summary: OptionalText(500),
  level: z14.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  order: z14.number().int().min(0).max(1e4).default(0),
  category: Category.default("management"),
  regionCode: Region.default("GLOBAL"),
  author: OptionalText(120),
  lessons: z14.array(z14.object({ lessonId: Slug, title: NonEmptyText(150), content: z14.string().max(2e4).optional(), minutes: z14.number().int().min(1).max(120).optional(), order: z14.number().int().min(0).max(1e3).default(0) }).strict()).max(50),
  status: z14.enum(["draft", "published"]).default("draft"),
  sources: z14.array(Reference).max(20).default([]),
  version: z14.number().int().nonnegative().optional()
}).strict();
var LessonParams = z14.object({ slug: Slug, lessonId: Slug });
var SlugParams = z14.object({ slug: Slug });
var IdParams = z14.object({ id: Id });
var ReportType = z14.enum(REPORT_TYPES);
var ReportQuery = z14.object({ format: z14.enum(REPORT_FORMATS).default("pdf"), from: LocalDate.optional(), to: LocalDate.optional(), flockId: Id.optional() }).refine((q8) => !q8.from || !q8.to || q8.from <= q8.to, { message: "from must be on or before to", path: ["from"] });

// ../../packages/validation/src/schemas/task.ts
import { z as z15 } from "zod";
var CreateTaskRequest = z15.object({
  id: Id.optional(),
  title: NonEmptyText(200),
  description: OptionalText(2e3),
  kind: z15.enum(["general", "follow_up"]).default("general"),
  dueDate: LocalDate.optional(),
  priority: TaskPriority.default("normal"),
  flockId: Id.optional(),
  houseId: Id.optional(),
  assigneeUserId: Id.optional()
}).strict();
var UpdateTaskRequest = CreateTaskRequest.omit({ id: true, kind: true }).extend({ version: z15.number().int().nonnegative() }).strict();
var TaskListQuery = z15.object({
  /** "active" = open or in progress. */
  status: z15.enum(["active", "open", "in_progress", "done", "cancelled", "all"]).default("active"),
  /** "me" = assigned to the person asking, or to nobody. */
  assignee: z15.union([z15.literal("me"), z15.literal("any"), Id]).default("any"),
  due: z15.enum(["overdue", "today", "upcoming", "none", "any"]).default("any"),
  flockId: Id.optional(),
  houseId: Id.optional(),
  limit: z15.coerce.number().int().min(1).max(200).default(100)
});
var CompleteTaskRequest = z15.object({ notes: OptionalText(2e3), version: z15.number().int().nonnegative().optional() }).strict();
var CancelTaskRequest = z15.object({ reason: NonEmptyText(500) }).strict();

// src/adapters/mongo/farm-repo.ts
var sess = (tx) => tx?.session ? { session: tx.session } : {};
function fromDoc(doc) {
  const { _id, ...rest } = doc;
  const out = { id: _id };
  for (const [k, v] of Object.entries(rest)) if (v !== null && v !== void 0) out[k] = v instanceof Map ? Object.fromEntries(v) : v;
  return out;
}
function toUpdate(patch) {
  const $set = {};
  const $unset = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id" || k === "farmId" || k === "version") continue;
    if (v === void 0) $unset[k] = "";
    else $set[k] = v;
  }
  return { ...Object.keys($set).length ? { $set } : {}, ...Object.keys($unset).length ? { $unset } : {} };
}
function createMongoFarmRepo(model, opts) {
  const liveFilter = opts.softDelete ? { deletedAt: null } : {};
  function buildFilter(farmId, q8) {
    const filter = { farmId, ...liveFilter };
    const col2 = (k) => k === "id" ? "_id" : k;
    for (const [k, v] of Object.entries(q8?.where ?? {})) filter[col2(k)] = Array.isArray(v) ? { $in: v } : v;
    for (const [k, v] of Object.entries(q8?.exists ?? {})) filter[col2(k)] = { $exists: v };
    if (q8?.range) filter[q8.range.field] = { ...q8.range.from !== void 0 ? { $gte: q8.range.from } : {}, ...q8.range.to !== void 0 ? { $lte: q8.range.to } : {} };
    if (q8?.after) filter["$or"] = [{ date: { $lt: q8.after.date } }, { date: q8.after.date, _id: { $lt: q8.after.id } }];
    return filter;
  }
  const toDoc2 = (rec) => {
    const { id, ...rest } = rec;
    return { _id: id, ...rest };
  };
  return {
    async findById(farmId, id, tx) {
      const doc = await model.findOne({ _id: id, farmId, ...liveFilter }, null, sess(tx)).lean();
      return doc ? fromDoc(doc) : null;
    },
    async find(farmId, q8, tx) {
      const filter = buildFilter(farmId, q8);
      let query = model.find(filter, null, sess(tx));
      if (q8?.sort?.length) query = query.sort(Object.fromEntries(q8.sort.map((s2) => [s2.field === "id" ? "_id" : s2.field, s2.dir])));
      if (q8?.limit) query = query.limit(q8.limit);
      return (await query.lean()).map((d) => fromDoc(d));
    },
    async insert(rec, tx) {
      await model.create([toDoc2(rec)], sess(tx));
    },
    async insertMany(recs, tx) {
      if (recs.length) await model.create(recs.map(toDoc2), { ...sess(tx), ordered: true });
    },
    async aggregate(farmId, q8, by, sums) {
      const rows = await model.aggregate([
        // farmId is the first condition, so the pipeline is tenant-scoped like every other query.
        { $match: buildFilter(farmId, q8) },
        { $group: { _id: Object.fromEntries(by.map((k) => [k, `$${k}`])), count: { $sum: 1 }, ...Object.fromEntries(sums.map((s2) => [s2, { $sum: `$${s2}` }])) } }
      ]);
      return rows.map((r) => ({
        key: Object.fromEntries(by.map((k) => [k, r["_id"]?.[k] ?? null])),
        sums: Object.fromEntries(sums.map((s2) => [s2, Number(r[s2]) || 0])),
        count: r["count"]
      }));
    },
    async update(farmId, id, patch, o, tx) {
      const filter = { _id: id, farmId, ...liveFilter, ...o?.expectedVersion !== void 0 ? { version: o.expectedVersion } : {} };
      const update = { ...toUpdate(patch), ...opts.versioned ? { $inc: { version: 1 } } : {} };
      const doc = await model.findOneAndUpdate(filter, update, { new: true, runValidators: true, ...sess(tx) }).lean();
      return doc ? fromDoc(doc) : null;
    }
  };
}

// src/adapters/mongo/index.ts
var s = (tx) => tx?.session ? { session: tx.session } : {};
function fromDoc2(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const out = { id: _id };
  for (const [k, v] of Object.entries(rest)) if (v !== null && v !== void 0) out[k] = v;
  return out;
}
function toDoc(rec) {
  const { id, ...rest } = rec;
  return { _id: id, ...rest };
}
function toUpdate2(patch) {
  const $set = {};
  const $unset = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id") continue;
    if (v === void 0) $unset[k] = "";
    else $set[k] = v;
  }
  return { ...Object.keys($set).length ? { $set } : {}, ...Object.keys($unset).length ? { $unset } : {} };
}
function createMongoContentRepo(model, titleField) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    async find(q8) {
      const filter = {};
      if (q8.status !== void 0) filter["status"] = Array.isArray(q8.status) ? { $in: q8.status } : q8.status;
      if (q8.kind) filter["kind"] = q8.kind;
      if (q8.category) filter["category"] = q8.category;
      if (q8.locale) filter["locale"] = q8.locale;
      if (q8.regionCodes) filter["regionCode"] = { $in: q8.regionCodes };
      if (q8.text) filter[titleField] = { $regex: esc(q8.text), $options: "i" };
      const sortBy = q8.sortBy ?? "updatedAt";
      const dir = sortBy === "order" || sortBy === "term" ? 1 : -1;
      const docs = await model.find(filter).sort({ [sortBy]: dir, _id: 1 }).limit(q8.limit).lean();
      return docs.map((d) => fromDoc2(d));
    },
    findById: (id) => findOne(model, { _id: id }),
    findBySlug: (slug, locale2) => findOne(model, { slug, locale: locale2 }),
    async insert(rec) {
      await model.create([toDoc(rec)]);
    },
    async update(id, patch, expectedVersion) {
      const cur = await model.findOne({ _id: id }).lean();
      if (!cur || cur.version !== expectedVersion) return null;
      const merged = { ...cur, ...patch, version: expectedVersion + 1 };
      for (const [k, v] of Object.entries(patch)) if (v === void 0) delete merged[k];
      delete merged["id"];
      await new model(merged).validate();
      const r = await model.updateOne({ _id: id, version: expectedVersion }, toUpdate2({ ...patch, version: expectedVersion + 1 }));
      if (r.matchedCount === 0) return null;
      return fromDoc2(await model.findOne({ _id: id }).lean());
    }
  };
}
async function findOne(model, filter, tx) {
  return fromDoc2(await model.findOne(filter, null, s(tx)).lean());
}
var activeSession = new AsyncLocalStorage();
function createMongoRepositories(connection = mongoose.connection) {
  return {
    tx: {
      async run(fn) {
        const outer = activeSession.getStore();
        if (outer) return fn({ session: outer });
        const session = await connection.startSession();
        try {
          let result;
          await activeSession.run(
            session,
            () => session.withTransaction(async () => {
              result = await fn({ session });
            })
          );
          return result;
        } finally {
          await session.endSession();
        }
      }
    },
    users: {
      findById: (id, tx) => findOne(UserModel, { _id: id }, tx),
      findByEmail: (email, tx) => findOne(UserModel, { email: email.toLowerCase() }, tx),
      findByGoogleSub: (sub, tx) => findOne(UserModel, { googleSub: sub }, tx),
      async create(rec, tx) {
        await UserModel.create([toDoc(rec)], s(tx));
      },
      async update(id, patch, tx) {
        const doc = await UserModel.findOneAndUpdate({ _id: id }, { ...toUpdate2(patch), $inc: { version: 1 } }, { new: true, ...s(tx) }).lean();
        return fromDoc2(doc);
      }
    },
    sessions: {
      async create(rec, tx) {
        await SessionModel.create([toDoc(rec)], s(tx));
      },
      findById: (id, tx) => findOne(SessionModel, { _id: id }, tx),
      async listForUser(userId, tx) {
        const docs = await SessionModel.find({ userId }, null, s(tx)).sort({ lastUsedAt: -1 }).lean();
        return docs.map((d) => fromDoc2(d));
      },
      async touch(id, at, tx) {
        await SessionModel.updateOne({ _id: id }, { $set: { lastUsedAt: at } }, s(tx));
      },
      async revoke(id, at, reason, tx) {
        await SessionModel.updateOne({ _id: id, revokedAt: { $exists: false } }, { $set: { revokedAt: at, revokedReason: reason } }, s(tx));
      },
      async revokeAllForUser(userId, at, reason, exceptId, tx) {
        const filter = { userId, revokedAt: { $exists: false }, ...exceptId ? { _id: { $ne: exceptId } } : {} };
        const res = await SessionModel.updateMany(filter, { $set: { revokedAt: at, revokedReason: reason } }, s(tx));
        return res.modifiedCount;
      }
    },
    refreshTokens: {
      async create(rec, tx) {
        await RefreshTokenModel.create([toDoc(rec)], s(tx));
      },
      findByHash: (h, tx) => findOne(RefreshTokenModel, { tokenHash: h }, tx),
      async update(id, patch, tx) {
        await RefreshTokenModel.updateOne({ _id: id }, toUpdate2(patch), s(tx));
      }
    },
    oneTimeTokens: {
      async create(rec, tx) {
        await OneTimeTokenModel.create([toDoc(rec)], s(tx));
      },
      findByHash: (h, tx) => findOne(OneTimeTokenModel, { tokenHash: h }, tx),
      async markUsed(id, at, tx) {
        await OneTimeTokenModel.updateOne({ _id: id }, { $set: { usedAt: at } }, s(tx));
      },
      async invalidateForUser(userId, purpose, at, tx) {
        await OneTimeTokenModel.updateMany({ userId, purpose, usedAt: { $exists: false } }, { $set: { usedAt: at } }, s(tx));
      }
    },
    farms: {
      findById: (id, tx) => findOne(FarmModel, { _id: id, deletedAt: null }, tx),
      async findByIds(ids, tx) {
        const docs = await FarmModel.find({ _id: { $in: ids }, deletedAt: null }, null, s(tx)).lean();
        return docs.map((d) => fromDoc2(d));
      },
      async create(rec, tx) {
        await FarmModel.create([toDoc(rec)], s(tx));
      },
      async listIds() {
        return (await FarmModel.find({ deletedAt: null }, { _id: 1 }).lean()).map((d) => String(d._id));
      },
      async updateVersioned(id, expectedVersion, patch, tx) {
        const doc = await FarmModel.findOneAndUpdate(
          { _id: id, version: expectedVersion },
          { ...toUpdate2(patch), $inc: { version: 1 } },
          { new: true, ...s(tx) }
        ).lean();
        return fromDoc2(doc);
      }
    },
    memberships: {
      findById: (farmId, id, tx) => findOne(MembershipModel, { farmId, _id: id }, tx),
      findActive: (farmId, userId, tx) => findOne(MembershipModel, { farmId, userId, status: "active" }, tx),
      async findByFarm(farmId, tx) {
        return (await MembershipModel.find({ farmId }, null, s(tx)).lean()).map((d) => fromDoc2(d));
      },
      findByFarmAndEmail: (farmId, email, tx) => findOne(MembershipModel, { farmId, email: email.toLowerCase(), status: { $ne: "revoked" } }, tx),
      countActiveOwners: (farmId, tx) => MembershipModel.countDocuments({ farmId, role: "owner", status: "active" }, s(tx)),
      async create(rec, tx) {
        await MembershipModel.create([toDoc(rec)], s(tx));
      },
      async update(farmId, id, patch, tx) {
        const doc = await MembershipModel.findOneAndUpdate({ farmId, _id: id }, { ...toUpdate2(patch), $inc: { version: 1 } }, { new: true, ...s(tx) }).lean();
        return fromDoc2(doc);
      },
      async findActiveForUser(userId, tx) {
        const docs = await MembershipModel.find({ userId, status: "active" }, null, s(tx)).setOptions({ crossFarm: true }).lean();
        return docs.map((d) => fromDoc2(d));
      },
      async findByInviteHash(h, tx) {
        const doc = await MembershipModel.findOne({ inviteTokenHash: h }, null, s(tx)).setOptions({ crossFarm: true }).lean();
        return fromDoc2(doc);
      }
    },
    audit: {
      async insert(rec, tx) {
        await AuditLogModel.create([{ ...toDoc(rec), createdAt: rec.at, updatedAt: rec.at }], s(tx));
      },
      async list(farmId, { beforeId, limit }, tx) {
        const filter = { farmId, ...beforeId ? { _id: { $lt: beforeId } } : {} };
        const docs = await AuditLogModel.find(filter, null, s(tx)).sort({ _id: -1 }).limit(limit).lean();
        return docs.map((d) => fromDoc2(d));
      }
    },
    idempotency: {
      async begin(rec) {
        try {
          await IdempotencyModel.create(toDoc(rec));
          return { created: true };
        } catch (e) {
          if (e.code !== 11e3) throw e;
          const existing = fromDoc2(await IdempotencyModel.findById(rec.id).lean());
          return { created: false, existing };
        }
      },
      async complete(id, status, body) {
        await IdempotencyModel.updateOne({ _id: id }, { $set: { status: "done", responseStatus: status, responseBody: body } });
      },
      async release(id) {
        await IdempotencyModel.deleteOne({ _id: id });
      }
    },
    sync: {
      async nextSeq(farmId, tx) {
        const at = /* @__PURE__ */ new Date();
        const doc = await CounterModel.findOneAndUpdate(
          { _id: `sync:${farmId}` },
          { $inc: { value: 1 }, $set: { updatedAt: at }, $setOnInsert: { createdAt: at } },
          { new: true, upsert: true, ...s(tx) }
        ).lean();
        return doc.value;
      },
      async insertChange(rec, tx) {
        await SyncChangeModel.create([{ _id: `${rec.farmId}:${rec.seq}`, ...rec, createdAt: rec.at, updatedAt: rec.at }], s(tx));
      },
      async listSince(farmId, since, limit, tx) {
        const docs = await SyncChangeModel.find({ farmId, seq: { $gt: since } }, { _id: 0, createdAt: 0, updatedAt: 0 }, s(tx)).sort({ seq: 1 }).limit(limit).lean();
        return docs;
      },
      // _id is `${farmId}:${mutationId}`; farmId is repeated in the filter for the tenancy plugin.
      findProcessed: (id, tx) => findOne(SyncOperationModel, { _id: id, farmId: id.split(":")[0] }, tx),
      async saveProcessed(rec, tx) {
        const { at, ...rest } = rec;
        await SyncOperationModel.create([{ ...toDoc(rest), createdAt: at, updatedAt: at }], s(tx));
      }
    },
    ledgerProbe: {
      async hasEntries() {
        return false;
      }
    },
    houses: createMongoFarmRepo(HouseModel, { softDelete: true, versioned: true }),
    flocks: createMongoFarmRepo(FlockModel, { softDelete: true, versioned: true }),
    flockEvents: createMongoFarmRepo(FlockEventModel, { softDelete: false, versioned: false }),
    dailyRecords: createMongoFarmRepo(DailyRecordModel, { softDelete: true, versioned: true }),
    birdWeights: createMongoFarmRepo(BirdWeightModel, { softDelete: true, versioned: true }),
    feedConsumption: createMongoFarmRepo(FeedConsumptionModel, { softDelete: true, versioned: true }),
    waterRecords: createMongoFarmRepo(WaterRecordModel, { softDelete: true, versioned: true }),
    eggRecords: createMongoFarmRepo(EggRecordModel, { softDelete: true, versioned: true }),
    eggInventory: createMongoFarmRepo(EggInventoryModel, { softDelete: false, versioned: false }),
    healthRecords: createMongoFarmRepo(HealthRecordModel, { softDelete: true, versioned: true }),
    mediaAssets: createMongoFarmRepo(MediaAssetModel, { softDelete: true, versioned: true }),
    inventoryItems: createMongoFarmRepo(InventoryItemModel, { softDelete: true, versioned: true }),
    inventoryLots: createMongoFarmRepo(InventoryLotModel, { softDelete: true, versioned: true }),
    inventoryTransactions: createMongoFarmRepo(InventoryTransactionModel, { softDelete: false, versioned: false }),
    chickLots: createMongoFarmRepo(ChickLotModel, { softDelete: true, versioned: true }),
    alerts: createMongoFarmRepo(AlertModel, { softDelete: false, versioned: true }),
    medicines: createMongoFarmRepo(MedicineModel, { softDelete: true, versioned: true }),
    vaccinationProgrammes: createMongoFarmRepo(VaccinationProgrammeModel, { softDelete: true, versioned: true }),
    vaccinations: createMongoFarmRepo(VaccinationModel, { softDelete: true, versioned: true }),
    checklistTemplates: createMongoFarmRepo(ChecklistTemplateModel, { softDelete: true, versioned: true }),
    visitors: createMongoFarmRepo(VisitorModel, { softDelete: true, versioned: true }),
    biosecurityLogs: createMongoFarmRepo(BiosecurityLogModel, { softDelete: true, versioned: true }),
    cleaningTasks: createMongoFarmRepo(CleaningTaskModel, { softDelete: true, versioned: true }),
    equipment: createMongoFarmRepo(EquipmentModel, { softDelete: true, versioned: true }),
    equipmentMovements: createMongoFarmRepo(EquipmentMovementModel, { softDelete: false, versioned: false }),
    tasks: createMongoFarmRepo(TaskModel, { softDelete: true, versioned: true }),
    hatcheryBatches: createMongoFarmRepo(HatcheryBatchModel, { softDelete: true, versioned: true }),
    hatcheryEvents: createMongoFarmRepo(HatcheryEventModel, { softDelete: false, versioned: false }),
    buyers: createMongoFarmRepo(BuyerModel, { softDelete: true, versioned: true }),
    orders: createMongoFarmRepo(OrderModel, { softDelete: true, versioned: true }),
    broodingProfiles: createMongoFarmRepo(BroodingProfileModel, { softDelete: true, versioned: true }),
    chickArrivals: createMongoFarmRepo(ChickArrivalModel, { softDelete: true, versioned: true }),
    brooderChecks: createMongoFarmRepo(BrooderCheckModel, { softDelete: true, versioned: true }),
    suppliers: createMongoFarmRepo(SupplierModel, { softDelete: true, versioned: true }),
    moneyAccounts: createMongoFarmRepo(MoneyAccountModel, { softDelete: true, versioned: true }),
    expenses: createMongoFarmRepo(ExpenseModel, { softDelete: true, versioned: true }),
    incomes: createMongoFarmRepo(IncomeModel, { softDelete: true, versioned: true }),
    recurringExpenses: createMongoFarmRepo(RecurringExpenseModel, { softDelete: true, versioned: true }),
    transactions: createMongoFarmRepo(TransactionModel, { softDelete: false, versioned: false }),
    listings: createMongoFarmRepo(MarketListingModel, { softDelete: true, versioned: true }),
    orderPayments: createMongoFarmRepo(OrderPaymentModel, { softDelete: false, versioned: false }),
    alertRules: createMongoFarmRepo(AlertRuleModel, { softDelete: false, versioned: true }),
    notifications: {
      async insertMany(recs, tx) {
        if (recs.length) await NotificationModel.create(recs.map(toDoc), { ...s(tx), ordered: true });
      },
      async forUser(userId, q8) {
        const docs = await NotificationModel.find({ userId, channel: "in_app", ...q8.unreadOnly ? { readAt: null } : {} }).sort({ createdAt: -1 }).limit(q8.limit).lean();
        return docs.map((d) => fromDoc2(d));
      },
      unreadCount: (userId) => NotificationModel.countDocuments({ userId, channel: "in_app", readAt: null }),
      async markRead(userId, ids, at) {
        const r = await NotificationModel.updateMany({ userId, channel: "in_app", readAt: null, ...ids === "all" ? {} : { _id: { $in: ids } } }, { $set: { readAt: at, status: "read", updatedAt: at } });
        return r.modifiedCount;
      },
      async due(now, limit) {
        const docs = await NotificationModel.find({ status: "queued", $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] }).limit(limit).lean();
        return docs.map((d) => fromDoc2(d));
      },
      async update(id, patch) {
        await NotificationModel.updateOne({ _id: id }, toUpdate2(patch));
      },
      async claim(id, expected, leaseUntil) {
        const r = await NotificationModel.updateOne({ _id: id, status: "queued", nextAttemptAt: expected }, { $set: { nextAttemptAt: leaseUntil } });
        return r.modifiedCount === 1;
      },
      async existingDedupeKeys(keys, tx) {
        if (!keys.length) return /* @__PURE__ */ new Set();
        const docs = await NotificationModel.find({ dedupeKey: { $in: keys } }, { dedupeKey: 1 }, s(tx)).lean();
        return new Set(docs.map((d) => d.dedupeKey).filter((k) => !!k));
      },
      async lastForAlert(alertId, userId, channel) {
        const d = await NotificationModel.findOne({ alertId, userId, channel }).sort({ createdAt: -1 }).lean();
        return d ? fromDoc2(d) : null;
      }
    },
    pushDevices: {
      async upsertByToken(rec) {
        const { id, createdAt, ...rest } = rec;
        const d = await PushDeviceModel.findOneAndUpdate({ token: rec.token }, { $set: rest, $unset: { disabledAt: "" }, $setOnInsert: { _id: id, createdAt } }, { upsert: true, new: true }).lean();
        return fromDoc2(d);
      },
      async activeForUser(userId) {
        return (await PushDeviceModel.find({ userId, disabledAt: null }).lean()).map((d) => fromDoc2(d));
      },
      async disableTokens(tokens, at) {
        if (tokens.length) await PushDeviceModel.updateMany({ token: { $in: tokens } }, { $set: { disabledAt: at, updatedAt: at } });
      },
      async remove(userId, id) {
        return (await PushDeviceModel.deleteOne({ _id: id, userId })).deletedCount === 1;
      }
    },
    notificationPreferences: {
      get: async (userId) => {
        const d = await NotificationPreferenceModel.findOne({ userId }).lean();
        return d ? fromDoc2(d) : null;
      },
      async put(rec) {
        const { id, createdAt, ...rest } = rec;
        await NotificationPreferenceModel.updateOne({ userId: rec.userId }, { $set: rest, $setOnInsert: { _id: id, createdAt } }, { upsert: true, runValidators: true });
      }
    },
    weather: {
      async getCache(provider, locationKey2, kind) {
        const d = await WeatherCacheModel.findOne({ provider, locationKey: locationKey2, kind }).lean();
        return d ? fromDoc2(d) : null;
      },
      async putCache(rec) {
        const { id, createdAt, ...rest } = rec;
        await WeatherCacheModel.updateOne({ provider: rec.provider, locationKey: rec.locationKey, kind: rec.kind }, { $set: rest, $setOnInsert: { _id: id, createdAt } }, { upsert: true });
      },
      async upsertObservations(recs) {
        if (!recs.length) return;
        await WeatherObservationModel.bulkWrite(
          recs.map((r) => {
            const { id, createdAt, ...rest } = r;
            return { updateOne: { filter: { locationKey: r.locationKey, date: r.date }, update: { $set: rest, $setOnInsert: { _id: id, createdAt } }, upsert: true } };
          })
        );
      },
      async observations(locationKey2, from, to) {
        return (await WeatherObservationModel.find({ locationKey: locationKey2, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean()).map((d) => fromDoc2(d));
      }
    },
    // Cross-farm by design (marketplace browse and buyer views); callers check what each user may see.
    market: {
      async activeListings(q8) {
        const filter = { status: "active", deletedAt: null };
        if (q8.category) filter["category"] = q8.category;
        if (q8.regionCode) filter["regionCode"] = { $in: [q8.regionCode, new RegExp(`^${q8.regionCode.replace(/[^A-Z0-9-]/g, "")}-`)] };
        if (q8.text) filter["title"] = { $regex: q8.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        const docs = await MarketListingModel.find(filter).setOptions({ crossFarm: true }).sort({ createdAt: -1 }).limit(q8.limit).lean();
        return docs.map((d) => fromDoc2(d));
      },
      async listingById(id) {
        const d = await MarketListingModel.findOne({ _id: id, deletedAt: null }).setOptions({ crossFarm: true }).lean();
        return d ? fromDoc2(d) : null;
      },
      async orderById(id) {
        const d = await OrderModel.findOne({ _id: id, deletedAt: null }).setOptions({ crossFarm: true }).lean();
        return d ? fromDoc2(d) : null;
      },
      async ordersForBuyer(userId) {
        const docs = await OrderModel.find({ buyerUserId: userId, deletedAt: null }).setOptions({ crossFarm: true }).sort({ createdAt: -1 }).limit(500).lean();
        return docs.map((d) => fromDoc2(d));
      }
    },
    counters: {
      async next(name, farmId, tx) {
        const at = /* @__PURE__ */ new Date();
        const doc = await CounterModel.findOneAndUpdate({ _id: `${name}:${farmId}` }, { $inc: { value: 1 }, $set: { updatedAt: at }, $setOnInsert: { createdAt: at } }, { new: true, upsert: true, ...s(tx) }).lean();
        return doc.value;
      }
    },
    articles: { ...createMongoContentRepo(ArticleModel, "title"), findBySourceUrl: (url) => findOne(ArticleModel, { sourceUrl: url }) },
    glossary: createMongoContentRepo(GlossaryTermModel, "term"),
    courses: createMongoContentRepo(TrainingCourseModel, "title"),
    trainingProgress: {
      async complete(userId, courseId, lessonId, at) {
        await TrainingProgressModel.updateOne({ userId, lessonId }, { $setOnInsert: { _id: `${userId}:${courseId}:${lessonId}`, userId, courseId, lessonId, completedAt: at, createdAt: at, updatedAt: at } }, { upsert: true });
      },
      async forUser(userId, courseId) {
        const docs = await TrainingProgressModel.find({ userId, ...courseId ? { courseId } : {} }).lean();
        return docs.map((d) => ({ courseId: d.courseId, lessonId: d.lessonId, completedAt: d.completedAt }));
      }
    },
    // Cross-farm by design: returns only the farmId, which the caller then checks membership for.
    async locateDailyRecord(id) {
      const doc = await DailyRecordModel.findOne({ _id: id, deletedAt: null }, { farmId: 1 }).setOptions({ crossFarm: true }).lean();
      return doc?.farmId ?? null;
    }
  };
}

// src/http/routes/task.routes.ts
import { Router } from "express";
import { z as z16 } from "zod";

// src/http/middleware/core.ts
import { ZodError as ZodError2 } from "zod";

// src/lib/errors.ts
var AppError = class extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "AppError";
    this.status = ERROR_CODES[code];
  }
  code;
  details;
  status;
};
var notFound = (what) => new AppError("NOT_FOUND", `${what} not found`);
var forbidden = (msg = "You do not have permission to do this") => new AppError("FORBIDDEN", msg);

// src/lib/util.ts
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { v7 as uuidv7 } from "uuid";
var newId = () => uuidv7();
var randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
var sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
var systemClock = { now: () => /* @__PURE__ */ new Date() };
function shallowDiff(before, after) {
  const out = {};
  const keys = /* @__PURE__ */ new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    if (["updatedAt", "version", "passwordHash", "inviteTokenHash"].includes(k)) continue;
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) out[k] = { before: b, after: a };
  }
  return out;
}

// src/services/sync.service.ts
import { ZodError } from "zod";

// src/services/context.ts
function assertCan(ctx, action) {
  if (!can(ctx.role, action)) throw forbidden(`Your role (${ctx.role}) cannot perform ${action}`);
}
function assertCanManage(ctx, role, what) {
  if (!canManageRole(ctx.role, role)) {
    throw new AppError(
      "ROLE_HIERARCHY",
      what === "assign" ? `Your role (${ctx.role}) cannot give someone the ${role} role` : `Your role (${ctx.role}) cannot change or remove a member with the ${role} role`,
      { yourRole: ctx.role, targetRole: role }
    );
  }
}

// src/services/sync.service.ts
var VersionConflict = class extends Error {
  constructor(serverVersion, serverDocument) {
    super("Version conflict");
    this.serverVersion = serverVersion;
    this.serverDocument = serverDocument;
  }
  serverVersion;
  serverDocument;
};
function createSyncService(repos, clock) {
  const handlers = /* @__PURE__ */ new Map();
  return {
    register(command, handler) {
      if (handlers.has(command)) throw new Error(`Command ${command} already registered`);
      handlers.set(command, handler);
    },
    async recordChange(farmId, change, tx) {
      const seq = await repos.sync.nextSeq(farmId, tx);
      await repos.sync.insertChange({ farmId, seq, ...change, at: clock.now() }, tx);
      return seq;
    },
    async pull(farmId, since, limit) {
      const rows = await repos.sync.listSince(farmId, since, limit + 1);
      const page = rows.slice(0, limit);
      return {
        changes: page.map((c) => ({
          seq: c.seq,
          entity: c.entity,
          entityId: c.entityId,
          op: c.op,
          version: c.version,
          document: c.document,
          at: c.at.toISOString()
        })),
        nextSince: page.length ? page[page.length - 1].seq : since,
        hasMore: rows.length > limit
      };
    },
    /**
     * Applies mutations in order. Each accepted mutation and its "processed" record are written in ONE transaction,
     * so a mutation is either applied and remembered, or not applied at all: if the connection or the server dies
     * mid-way, resending the same mutationId never applies it twice (the stored result is returned instead).
     * Two pushes of the same mutation at once: the second insert of the processed record fails, its transaction
     * rolls back, and it returns the first one's result.
     */
    async push(ctx, req) {
      const results = [];
      for (const m of req.mutations) {
        const processedId = `${ctx.farmId}:${m.mutationId}`;
        const prior = await repos.sync.findProcessed(processedId);
        if (prior) {
          results.push(prior.result);
          continue;
        }
        const handler = handlers.get(m.command);
        const record = (result) => {
          const at = clock.now();
          return {
            id: processedId,
            farmId: ctx.farmId,
            mutationId: m.mutationId,
            userId: ctx.userId,
            deviceId: req.deviceId,
            command: m.command,
            ...m.entityId ? { entityId: m.entityId } : {},
            ...m.baseVersion !== void 0 ? { baseVersion: m.baseVersion } : {},
            status: result.status,
            result,
            receivedAt: at,
            at
          };
        };
        const saveRejection = async (result) => {
          try {
            await repos.sync.saveProcessed(record(result));
            return result;
          } catch (e) {
            const winner = await repos.sync.findProcessed(processedId);
            if (winner) return winner.result;
            throw e;
          }
        };
        if (!handler) {
          results.push(await saveRejection({ mutationId: m.mutationId, status: "rejected", code: "UNKNOWN_COMMAND", message: `Unknown command ${m.command}` }));
          continue;
        }
        const mctx = { ...ctx, mutationId: m.mutationId, deviceId: req.deviceId };
        try {
          const accepted = await repos.tx.run(async (tx) => {
            assertCan(mctx, handler.action);
            const payload = handler.schema.parse(m.payload);
            const out = await handler.run(mctx, payload, {
              ...m.baseVersion !== void 0 ? { baseVersion: m.baseVersion } : {},
              ...m.entityId ? { entityId: m.entityId } : {}
            });
            const result = { mutationId: m.mutationId, status: "accepted", ...out };
            await repos.sync.saveProcessed(record(result), tx);
            return result;
          });
          results.push(accepted);
        } catch (e) {
          if (e instanceof VersionConflict) {
            results.push({ mutationId: m.mutationId, status: "conflict", serverVersion: e.serverVersion, serverDocument: e.serverDocument });
            continue;
          }
          const winner = await repos.sync.findProcessed(processedId);
          if (winner) {
            results.push(winner.result);
            continue;
          }
          if (e instanceof AppError || e instanceof DomainError) {
            results.push(await saveRejection({ mutationId: m.mutationId, status: "rejected", code: e.code, message: e.message }));
          } else if (e instanceof ZodError) {
            results.push(await saveRejection({ mutationId: m.mutationId, status: "rejected", code: "VALIDATION_FAILED", message: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }));
          } else {
            throw e;
          }
        }
      }
      return results;
    }
  };
}

// src/http/middleware/core.ts
var requestId = (req, res, next) => {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && /^[\w-]{8,100}$/.test(incoming) ? incoming : newId();
  res.setHeader("x-request-id", req.requestId);
  next();
};
var ctxOf = (req) => ({
  userId: req.auth.userId,
  sessionId: req.auth.sessionId,
  requestId: req.requestId,
  ...req.header("x-device-id") ? { deviceId: req.header("x-device-id").slice(0, 100) } : {}
});
function authenticate(auth) {
  return async (req, _res, next) => {
    const h = req.header("authorization");
    if (!h?.startsWith("Bearer ")) return next(new AppError("UNAUTHENTICATED", "Sign in required"));
    req.auth = await auth.authenticateAccess(h.slice(7));
    next();
  };
}
function authenticateOptional(auth) {
  return async (req, _res, next) => {
    const h = req.header("authorization");
    if (h?.startsWith("Bearer ")) req.auth = await auth.authenticateAccess(h.slice(7));
    next();
  };
}
function requireFarm(farms, from = "params") {
  return async (req, _res, next) => {
    if (!req.auth) return next(new AppError("INTERNAL", "authenticate must run before requireFarm"));
    const src = from === "params" ? req.params : from === "body" ? req.body : req.query;
    const farmId = typeof src?.["farmId"] === "string" ? src["farmId"].toLowerCase() : "";
    if (!farmId) return next(new AppError("VALIDATION_FAILED", "farmId is required"));
    req.farmCtx = await farms.resolveContext(ctxOf(req), farmId);
    next();
  };
}
function requireFarmOf(locate, farms, param, label) {
  return async (req, _res, next) => {
    if (!req.auth) return next(new AppError("INTERNAL", "authenticate must run before requireFarmOf"));
    const id = req.params[param];
    const farmId = typeof id === "string" ? await locate(id.toLowerCase()) : null;
    if (!farmId) return next(notFound(label));
    try {
      req.farmCtx = await farms.resolveContext(ctxOf(req), farmId);
    } catch {
      return next(notFound(label));
    }
    next();
  };
}
function requirePermission(action) {
  return (req, _res, next) => {
    if (!req.farmCtx) return next(new AppError("INTERNAL", "requireFarm must run before requirePermission"));
    if (!can(req.farmCtx.role, action)) return next(forbidden(`Your role (${req.farmCtx.role}) cannot perform ${action}`));
    next();
  };
}
function requireFarmResource(name, param, loader, label = name) {
  return async (req, _res, next) => {
    if (!req.farmCtx) return next(new AppError("INTERNAL", "requireFarm must run before requireFarmResource"));
    const id = req.params[param];
    const rec = typeof id === "string" ? await loader(req.farmCtx.farmId, id.toLowerCase()) : null;
    if (!rec) return next(notFound(label));
    req.resources = { ...req.resources, [name]: rec };
    next();
  };
}
function validate(part, schema) {
  return (req, _res, next) => {
    const parsed = schema.parse(req[part]);
    if (part === "query") Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
    else req[part] = parsed;
    next();
  };
}
function idempotency(repo) {
  return async (req, res, next) => {
    const key = req.header("idempotency-key");
    if (req.idempotencyHandled) return next();
    req.idempotencyHandled = true;
    if (!key || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.auth) return next();
    if (!/^[\w-]{8,100}$/.test(key)) return next(new AppError("VALIDATION_FAILED", "Idempotency-Key must be 8\u2013100 letters, digits, - or _"));
    const id = `${req.auth.userId}:${key}`;
    const requestHash = sha256(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body ?? null)}`);
    const begun = await repo.begin({ id, requestHash, status: "processing", createdAt: /* @__PURE__ */ new Date() });
    if (!begun.created) {
      const ex = begun.existing;
      if (ex.requestHash !== requestHash) return next(new AppError("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was used for a different request"));
      if (ex.status === "processing") return next(new AppError("IDEMPOTENCY_IN_PROGRESS", "The original request is still being processed"));
      res.setHeader("idempotent-replayed", "true");
      return res.status(ex.responseStatus ?? 200).json(ex.responseBody);
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const status = res.statusCode;
      const done = status < 400 ? repo.complete(id, status, body) : repo.release(id);
      done.catch(() => void 0);
      return originalJson(body);
    };
    next();
  };
}
var notFoundHandler = (_req, _res, next) => next(new AppError("NOT_FOUND", "Route not found"));
function errorHandler(logger) {
  return (err, req, res, _next) => {
    const requestId2 = req.requestId;
    let status = 500;
    let body;
    if (err instanceof AppError) {
      status = err.status;
      body = { code: err.code, message: err.message, ...err.details !== void 0 ? { details: err.details } : {} };
    } else if (err instanceof DomainError) {
      status = 422;
      body = { code: err.code, message: err.message, ...err.details !== void 0 ? { details: err.details } : {} };
    } else if (err instanceof VersionConflict) {
      status = 409;
      body = { code: "VERSION_CONFLICT", message: "This record was changed by someone else. Review the latest version.", details: { serverVersion: err.serverVersion, serverDocument: err.serverDocument } };
    } else if (err instanceof ZodError2) {
      status = 400;
      body = { code: "VALIDATION_FAILED", message: "Some fields are invalid", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
    } else if (err instanceof SyntaxError && "body" in err) {
      status = 400;
      body = { code: "INVALID_JSON", message: "Request body is not valid JSON" };
    } else if (err.type === "entity.too.large") {
      status = 413;
      body = { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" };
    } else {
      logger.error({ err, requestId: requestId2 }, "unhandled error");
      body = { code: "INTERNAL", message: "Something went wrong. Please try again." };
    }
    if (status >= 500) {
      logger.error({ err, requestId: requestId2 }, body.message);
      body = { code: body.code === "INTERNAL" || !(err instanceof AppError) ? "INTERNAL" : body.code, message: "Something went wrong. Please try again." };
    }
    res.status(status).json({ error: { ...body, requestId: requestId2 } });
  };
}

// src/http/routes/task.routes.ts
function taskRoutes(tasks, farms) {
  const r = Router({ mergeParams: true });
  const farm = [validate("params", z16.object({ farmId: Id })), requireFarm(farms)];
  const one = [validate("params", z16.object({ farmId: Id, taskId: Id })), requireFarm(farms)];
  const id = (req) => req.params["taskId"];
  r.get("/", ...farm, requirePermission("task.read"), validate("query", TaskListQuery), async (req, res) => res.json(await tasks.list(req.farmCtx, req.query)));
  r.get("/today", ...farm, requirePermission("task.read"), async (req, res) => res.json(await tasks.today(req.farmCtx)));
  r.post("/", ...farm, requirePermission("task.manage"), validate("body", CreateTaskRequest), async (req, res) => res.status(201).json(await tasks.create(req.farmCtx, req.body)));
  r.get("/:taskId", ...one, requirePermission("task.read"), async (req, res) => res.json(await tasks.get(req.farmCtx, id(req))));
  r.put("/:taskId", ...one, requirePermission("task.manage"), validate("body", UpdateTaskRequest), async (req, res) => res.json(await tasks.update(req.farmCtx, id(req), req.body)));
  r.post("/:taskId/start", ...one, requirePermission("task.complete"), async (req, res) => res.json(await tasks.start(req.farmCtx, id(req))));
  r.post("/:taskId/complete", ...one, requirePermission("task.complete"), validate("body", CompleteTaskRequest), async (req, res) => res.json(await tasks.complete(req.farmCtx, id(req), req.body)));
  r.post("/:taskId/cancel", ...one, requirePermission("task.manage"), validate("body", CancelTaskRequest), async (req, res) => res.json(await tasks.cancel(req.farmCtx, id(req), req.body.reason)));
  r.post("/:taskId/reopen", ...one, requirePermission("task.manage"), async (req, res) => res.json(await tasks.reopen(req.farmCtx, id(req))));
  return r;
}

// src/app.ts
import cors from "cors";
import express2 from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

// src/http/routes/auth.routes.ts
import { Router as Router2 } from "express";
var clientMeta = (req) => ({
  requestId: req.requestId,
  ...req.header("user-agent") ? { userAgent: req.header("user-agent") } : {},
  ...req.ip ? { ip: req.ip } : {},
  ...req.body?.device ? { device: req.body.device } : {}
});
function authRoutes(auth, limiter) {
  const r = Router2();
  const authed = authenticate(auth);
  r.post("/register", limiter, validate("body", RegisterRequest), async (req, res) => {
    res.status(201).json(await auth.register(req.body, clientMeta(req)));
  });
  r.post("/verify-email", limiter, validate("body", VerifyEmailRequest), async (req, res) => {
    res.json({ user: await auth.verifyEmail(req.body.token, clientMeta(req)) });
  });
  r.post("/resend-verification", limiter, authed, async (req, res) => {
    res.status(202).json(await auth.resendVerification(req.auth.userId));
  });
  r.post("/login", limiter, validate("body", LoginRequest), async (req, res) => {
    res.json(await auth.login(req.body.email, req.body.password, clientMeta(req)));
  });
  r.post("/google", limiter, validate("body", GoogleLoginRequest), async (req, res) => {
    res.json(await auth.loginWithGoogle(req.body.idToken, clientMeta(req)));
  });
  r.post("/refresh", limiter, validate("body", RefreshRequest), async (req, res) => {
    res.json(await auth.refresh(req.body.refreshToken, clientMeta(req)));
  });
  r.post("/logout", authenticateOptional(auth), validate("body", LogoutRequest), async (req, res) => {
    await auth.logout({ ...req.body.refreshToken ? { refreshToken: req.body.refreshToken } : {}, ...req.auth ? { principal: req.auth } : {} }, clientMeta(req));
    res.status(204).end();
  });
  r.post("/forgot-password", limiter, validate("body", ForgotPasswordRequest), async (req, res) => {
    await auth.forgotPassword(req.body.email);
    res.status(202).json({ message: "If an account exists for that email, a reset link has been sent." });
  });
  r.post("/reset-password", limiter, validate("body", ResetPasswordRequest), async (req, res) => {
    await auth.resetPassword(req.body.token, req.body.newPassword, clientMeta(req));
    res.status(204).end();
  });
  r.post("/change-password", limiter, authed, validate("body", ChangePasswordRequest), async (req, res) => {
    res.json(await auth.changePassword(req.auth, req.body.currentPassword, req.body.newPassword, clientMeta(req)));
  });
  return r;
}

// src/http/routes/farm.routes.ts
import { Router as Router3 } from "express";
import { z as z17 } from "zod";
var FarmParams = z17.object({ farmId: Id });
var MemberParams = z17.object({ farmId: Id, memberId: Id });
function farmRoutes(farms, audit) {
  const r = Router3();
  const farm = [validate("params", FarmParams), requireFarm(farms)];
  const member = [validate("params", MemberParams), requireFarm(farms), requireFarmResource("member", "memberId", farms.findMember, "Member")];
  const memberOf = (req) => req.resources["member"];
  r.get("/", async (req, res) => {
    res.json({ items: await farms.listMine(req.auth.userId) });
  });
  r.post("/", validate("body", CreateFarmRequest), async (req, res) => {
    res.status(201).json(await farms.create(ctxOf(req), req.body));
  });
  r.post("/invitations/accept", validate("body", AcceptInviteRequest), async (req, res) => {
    res.json(await farms.acceptInvite(ctxOf(req), req.body.token));
  });
  r.get("/:farmId", ...farm, requirePermission("farm.read"), async (req, res) => {
    res.json(await farms.get(req.farmCtx));
  });
  r.put("/:farmId", ...farm, requirePermission("farm.update_settings"), validate("body", ReplaceFarmRequest), async (req, res) => {
    res.json(await farms.replace(req.farmCtx, req.body));
  });
  r.get("/:farmId/members", ...farm, requirePermission("member.read"), async (req, res) => {
    res.json({ items: await farms.listMembers(req.farmCtx) });
  });
  r.post("/:farmId/members", ...farm, requirePermission("member.invite"), validate("body", AddMemberRequest), async (req, res) => {
    res.status(201).json(await farms.addMember(req.farmCtx, req.body.email, req.body.role));
  });
  r.put("/:farmId/members/:memberId", ...member, requirePermission("member.change_role"), validate("body", UpdateMemberRequest), async (req, res) => {
    res.json(await farms.updateMember(req.farmCtx, memberOf(req), req.body.role));
  });
  r.delete("/:farmId/members/:memberId", ...member, async (req, res) => {
    await farms.removeMember(req.farmCtx, memberOf(req));
    res.status(204).end();
  });
  r.get("/:farmId/audit", ...farm, requirePermission("audit.read"), validate("query", PageQuery), async (req, res) => {
    const q8 = req.query;
    res.json(await audit.list(req.farmCtx.farmId, { limit: q8.limit, ...q8.cursor ? { cursor: q8.cursor } : {} }));
  });
  return r;
}

// src/http/routes/me.routes.ts
import { Router as Router4 } from "express";
import { z as z18 } from "zod";
function meRoutes(auth) {
  const r = Router4();
  r.get("/", async (req, res) => {
    res.json(await auth.me(req.auth));
  });
  r.put("/", validate("body", UpdateProfileRequest), async (req, res) => {
    res.json(await auth.updateProfile(req.auth, req.body));
  });
  r.get("/sessions", async (req, res) => {
    res.json({ items: await auth.listSessions(req.auth) });
  });
  r.delete("/sessions", async (req, res) => {
    res.json(await auth.revokeOtherSessions(req.auth, clientMeta(req)));
  });
  r.delete("/sessions/:sessionId", validate("params", z18.object({ sessionId: Id })), async (req, res) => {
    await auth.revokeSession(req.auth, req.params["sessionId"], clientMeta(req));
    res.status(204).end();
  });
  return r;
}

// src/http/routes/flock.routes.ts
import { Router as Router5 } from "express";
import { z as z19 } from "zod";
function flockRoutes(flocks, farms, repos, daily) {
  const r = Router5({ mergeParams: true });
  const farm = [validate("params", z19.object({ farmId: Id })), requireFarm(farms)];
  const flock = (action, extra = {}) => [
    validate("params", z19.object({ farmId: Id, flockId: Id, ...extra })),
    requireFarm(farms),
    requirePermission(action),
    requireFarmResource("flock", "flockId", (farmId, id) => repos.flocks.findById(farmId, id), "Flock")
  ];
  const fid = (req) => req.params["flockId"];
  const q8 = (req) => req.query;
  r.get("/", ...farm, requirePermission("production.read"), validate("query", FlockListQuery), async (req, res) => {
    res.json({ items: await flocks.list(req.farmCtx, q8(req)) });
  });
  r.post("/", ...farm, requirePermission("flock.manage"), validate("body", CreateFlockRequest), async (req, res) => {
    res.status(201).json(await flocks.create(req.farmCtx, req.body));
  });
  r.get("/:flockId", ...flock("production.read"), validate("query", MetricsQuery), async (req, res) => {
    res.json(await flocks.get(req.farmCtx, fid(req), q8(req)));
  });
  r.put("/:flockId", ...flock("flock.manage"), validate("body", ReplaceFlockRequest), async (req, res) => {
    res.json(await flocks.replace(req.farmCtx, fid(req), req.body));
  });
  r.delete("/:flockId", ...flock("flock.manage"), async (req, res) => {
    await flocks.remove(req.farmCtx, fid(req));
    res.status(204).end();
  });
  r.get("/:flockId/metrics", ...flock("production.read"), validate("query", MetricsQuery), async (req, res) => {
    res.json(await flocks.metrics(req.farmCtx, fid(req), q8(req)));
  });
  r.get("/:flockId/events", ...flock("production.read"), async (req, res) => {
    res.json({ items: await flocks.listEvents(req.farmCtx, fid(req)) });
  });
  r.post("/:flockId/placement", ...flock("flock.manage"), validate("body", PlaceFlockRequest), async (req, res) => {
    res.status(201).json(await flocks.place(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/mortality", ...flock("production.record"), validate("body", MortalityRequest), async (req, res) => {
    res.status(201).json(await flocks.recordMortality(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/culls", ...flock("production.record"), validate("body", CullRequest), async (req, res) => {
    res.status(201).json(await flocks.recordCull(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/transfers", ...flock("flock.manage"), validate("body", TransferRequest), async (req, res) => {
    res.status(201).json(await flocks.transfer(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/splits", ...flock("flock.manage"), validate("body", SplitRequest), async (req, res) => {
    res.status(201).json(await flocks.split(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/merge", ...flock("flock.manage"), validate("body", MergeRequest), async (req, res) => {
    res.status(201).json(await flocks.merge(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/sales", ...flock("flock.sell"), validate("body", SaleRequest), async (req, res) => {
    res.status(201).json(await flocks.sell(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/adjustments", ...flock("production.edit_any"), validate("body", AdjustmentRequest), async (req, res) => {
    res.status(201).json(await flocks.adjust(req.farmCtx, fid(req), req.body));
  });
  r.get("/:flockId/weighings", ...flock("production.read"), async (req, res) => res.json({ items: await flocks.weighings(req.farmCtx, req.params["flockId"]) }));
  r.post("/:flockId/weighings", ...flock("production.record"), validate("body", WeighingRequest), async (req, res) => {
    res.status(201).json(await flocks.weigh(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/close", ...flock("flock.manage"), validate("body", CloseFlockRequest), async (req, res) => {
    res.json(await flocks.close(req.farmCtx, fid(req), req.body));
  });
  r.post("/:flockId/events/:eventId/reverse", ...flock("production.edit_any", { eventId: Id }), validate("body", ReverseEventRequest), async (req, res) => {
    res.status(201).json(await flocks.reverse(req.farmCtx, fid(req), req.params["eventId"], req.body.reason));
  });
  r.get("/:flockId/daily-records", ...flock("production.read"), validate("query", DateRangeQuery.extend({ cursor: z19.string().max(500).optional(), limit: z19.coerce.number().int().min(1).max(200).default(50) })), async (req, res) => {
    const query = q8(req);
    res.json(await daily.list(req.farmCtx, { ...query, flockId: fid(req) }));
  });
  r.get("/:flockId/daily-records/:date", ...flock("production.read", { date: LocalDate }), async (req, res) => {
    res.json(await daily.getByFlockDate(req.farmCtx, fid(req), req.params["date"]));
  });
  r.patch(
    "/:flockId/daily-records/:date",
    ...flock("production.record", { date: LocalDate }),
    validate("body", PatchDailyRecordRequest),
    async (req, res) => res.json(await daily.patchByFlockDate(req.farmCtx, req.params["flockId"], req.params["date"], req.body))
  );
  r.put("/:flockId/daily-records/:date", ...flock("production.record", { date: LocalDate }), validate("body", UpsertDailyRecordRequest), async (req, res) => {
    const minimal = /\breturn=minimal\b/i.test(req.header("prefer") ?? "");
    res.json(await daily.upsertByFlockDate(req.farmCtx, fid(req), req.params["date"], req.body, { minimal }));
  });
  return r;
}

// src/http/routes/house.routes.ts
import { Router as Router6 } from "express";
import { z as z20 } from "zod";
function houseRoutes(houses, farms) {
  const r = Router6({ mergeParams: true });
  const farm = [validate("params", z20.object({ farmId: Id }).passthrough()), requireFarm(farms)];
  const one = [validate("params", z20.object({ farmId: Id, houseId: Id })), requireFarm(farms)];
  r.get("/", ...farm, requirePermission("production.read"), async (req, res) => {
    res.json({ items: await houses.list(req.farmCtx) });
  });
  r.post("/", ...farm, requirePermission("flock.manage"), validate("body", CreateHouseRequest), async (req, res) => {
    res.status(201).json(await houses.create(req.farmCtx, req.body));
  });
  r.get("/:houseId", ...one, requirePermission("production.read"), async (req, res) => {
    res.json(await houses.get(req.farmCtx, req.params["houseId"]));
  });
  r.put("/:houseId", ...one, requirePermission("flock.manage"), validate("body", ReplaceHouseRequest), async (req, res) => {
    res.json(await houses.replace(req.farmCtx, req.params["houseId"], req.body));
  });
  r.delete("/:houseId", ...one, requirePermission("flock.manage"), async (req, res) => {
    await houses.remove(req.farmCtx, req.params["houseId"]);
    res.status(204).end();
  });
  return r;
}

// src/http/routes/daily-record.routes.ts
import express, { Router as Router7 } from "express";
import { z as z21 } from "zod";

// src/services/media.service.ts
import { createHash as createHash2 } from "crypto";
var MAX_PHOTO_BYTES = 5 * 1024 * 1024;
function sniffImage(b) {
  if (b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-") return { contentType: "application/pdf", ext: "pdf" };
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return { contentType: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { contentType: "image/png", ext: "png" };
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return { contentType: "image/webp", ext: "webp" };
  return null;
}
function createMediaService(d) {
  const url = (farmId, id) => `/api/v1/farms/${farmId}/media/${id}`;
  const view = (a) => ({ id: a.id, contentType: a.contentType, sizeBytes: a.sizeBytes, url: url(a.farmId, a.id), createdAt: a.createdAt.toISOString() });
  return {
    /** Stores a photo for this farm. Mobile apps should resize and compress before uploading (≈ 1600 px, JPEG 80%). */
    async upload(ctx, bytes) {
      assertCan(ctx, "production.record");
      if (!bytes?.length) throw new AppError("VALIDATION_FAILED", "Send the photo as the request body");
      if (bytes.length > MAX_PHOTO_BYTES) throw new AppError("VALIDATION_FAILED", "Photos can be at most 5 MB");
      const kind = sniffImage(bytes);
      if (!kind) throw new AppError("VALIDATION_FAILED", "Only JPEG, PNG or WebP photos, or PDF documents (e.g. lab reports), can be uploaded");
      const id = newId();
      const storageKey = `${ctx.farmId}/${id}.${kind.ext}`;
      const now = d.clock.now();
      const rec = {
        id,
        farmId: ctx.farmId,
        contentType: kind.contentType,
        sizeBytes: bytes.length,
        sha256: createHash2("sha256").update(bytes).digest("hex"),
        storageKey,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      await d.storage.put(storageKey, bytes, kind.contentType);
      try {
        await d.repos.tx.run(async (tx) => {
          await d.repos.mediaAssets.insert(rec, tx);
          await d.audit.record(ctx, { action: "media.uploaded", entity: "media_asset", entityId: id, after: { contentType: rec.contentType, sizeBytes: rec.sizeBytes } }, tx);
        });
      } catch (e) {
        await d.storage.delete(storageKey).catch(() => void 0);
        throw e;
      }
      return view(rec);
    },
    async read(ctx, id) {
      assertCan(ctx, "production.read");
      const a = await d.repos.mediaAssets.findById(ctx.farmId, id);
      if (!a) throw notFound("Photo");
      const obj = await d.storage.get(a.storageKey);
      if (!obj) throw notFound("Photo");
      return { bytes: obj.bytes, contentType: a.contentType };
    }
  };
}

// src/http/routes/daily-record.routes.ts
var wantsMinimal = (req) => /\breturn=minimal\b/i.test(req.header("prefer") ?? "");
var farmParams = [validate("params", z21.object({ farmId: Id }))];
function farmDailyRecordRoutes(daily, farms) {
  const r = Router7({ mergeParams: true });
  const farm = [...farmParams, requireFarm(farms)];
  r.post("/", ...farm, requirePermission("production.record"), validate("body", CreateDailyRecordRequest), async (req, res) => {
    res.status(201).json(await daily.create(req.farmCtx, req.body, { minimal: wantsMinimal(req) }));
  });
  r.get("/", ...farm, requirePermission("production.read"), validate("query", DailyRecordListQuery), async (req, res) => {
    res.json(await daily.list(req.farmCtx, req.query));
  });
  r.get("/sheet", ...farm, requirePermission("production.read"), validate("query", z21.object({ date: LocalDate.optional() })), async (req, res) => {
    res.json(await daily.sheet(req.farmCtx, req.query));
  });
  return r;
}
function dailyRecordRoutes(daily, farms, repos) {
  const r = Router7();
  const one = [validate("params", z21.object({ id: Id })), requireFarmOf((id2) => repos.locateDailyRecord(id2), farms, "id", "Daily record")];
  const id = (req) => req.params["id"];
  r.get("/:id", ...one, requirePermission("production.read"), async (req, res) => {
    res.json(await daily.get(req.farmCtx, id(req)));
  });
  r.put("/:id", ...one, requirePermission("production.record"), validate("body", UpdateDailyRecordRequest), async (req, res) => {
    res.json(await daily.update(req.farmCtx, id(req), req.body, { minimal: wantsMinimal(req) }));
  });
  r.delete("/:id", ...one, requirePermission("production.record"), async (req, res) => {
    await daily.remove(req.farmCtx, id(req));
    res.status(204).end();
  });
  return r;
}
function dashboardRoutes(daily, farms) {
  const r = Router7({ mergeParams: true });
  const farm = [...farmParams, requireFarm(farms), requirePermission("production.read")];
  r.get("/day", ...farm, validate("query", DashboardDayQuery), async (req, res) => {
    res.json(await daily.dashboardDay(req.farmCtx, req.query));
  });
  r.get("/trends", ...farm, validate("query", TrendsQuery), async (req, res) => {
    res.json(await daily.trends(req.farmCtx, req.query));
  });
  return r;
}
function mediaRoutes(media, farms) {
  const r = Router7({ mergeParams: true });
  const raw = express.raw({ type: () => true, limit: MAX_PHOTO_BYTES });
  r.post("/", ...farmParams, requireFarm(farms), requirePermission("production.record"), raw, async (req, res) => {
    res.status(201).json(await media.upload(req.farmCtx, req.body));
  });
  r.get("/:assetId", validate("params", z21.object({ farmId: Id, assetId: Id })), requireFarm(farms), requirePermission("production.read"), async (req, res) => {
    const obj = await media.read(req.farmCtx, req.params["assetId"]);
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", obj.contentType === "application/pdf" ? `attachment; filename="${req.params["assetId"]}.pdf"` : "inline");
    res.setHeader("Cache-Control", "private, max-age=86400, immutable");
    res.send(obj.bytes);
  });
  return r;
}

// src/http/routes/inventory.routes.ts
import { Router as Router8 } from "express";
import { z as z22 } from "zod";
var q = (req) => req.query;
function inventoryRoutes(inv, farms, repos) {
  const r = Router8({ mergeParams: true });
  const farm = (a) => [validate("params", z22.object({ farmId: Id })), requireFarm(farms), requirePermission(a)];
  const item = (a) => [
    validate("params", z22.object({ farmId: Id, itemId: Id })),
    requireFarm(farms),
    requirePermission(a),
    requireFarmResource("item", "itemId", (farmId, id) => repos.inventoryItems.findById(farmId, id), "Inventory item")
  ];
  const iid = (req) => req.params["itemId"];
  r.get("/overview", ...farm("inventory.read"), async (req, res) => res.json(await inv.overview(req.farmCtx)));
  r.get("/items", ...farm("inventory.read"), validate("query", InventoryListQuery), async (req, res) => res.json({ items: await inv.listItems(req.farmCtx, q(req)) }));
  r.post("/items", ...farm("inventory.manage"), validate("body", CreateInventoryItemRequest), async (req, res) => res.status(201).json(await inv.createItem(req.farmCtx, req.body)));
  r.get("/items/:itemId", ...item("inventory.read"), async (req, res) => res.json(await inv.getItem(req.farmCtx, iid(req))));
  r.put("/items/:itemId", ...item("inventory.manage"), validate("body", UpdateInventoryItemRequest), async (req, res) => res.json(await inv.updateItem(req.farmCtx, iid(req), req.body)));
  r.post("/items/:itemId/purchases", ...item("inventory.manage"), validate("body", PurchaseRequest), async (req, res) => res.status(201).json(await inv.receivePurchase(req.farmCtx, iid(req), req.body)));
  r.post("/items/:itemId/issues", ...item("inventory.issue"), validate("body", IssueRequest), async (req, res) => res.status(201).json(await inv.issue(req.farmCtx, iid(req), req.body)));
  r.post("/items/:itemId/wastage", ...item("inventory.issue"), validate("body", WastageRequest), async (req, res) => res.status(201).json(await inv.wastage(req.farmCtx, iid(req), req.body)));
  r.post("/items/:itemId/counts", ...item("inventory.manage"), validate("body", StockCountRequest), async (req, res) => res.status(201).json(await inv.stockCount(req.farmCtx, iid(req), req.body)));
  r.get("/items/:itemId/transactions", ...item("inventory.read"), validate("query", TransactionsQuery), async (req, res) => res.json({ items: await inv.transactions(req.farmCtx, iid(req), q(req)) }));
  r.get("/lots", ...farm("inventory.read"), validate("query", LotsQuery), async (req, res) => res.json({ items: await inv.lots(req.farmCtx, q(req)) }));
  r.get("/eggs", ...farm("inventory.read"), async (req, res) => res.json(await inv.eggStock(req.farmCtx)));
  r.post("/eggs/movements", ...farm("inventory.issue"), validate("body", EggMovementRequest), async (req, res) => res.status(201).json(await inv.eggMovement(req.farmCtx, req.body)));
  r.get("/chick-lots", ...farm("inventory.read"), validate("query", ChickLotsQuery), async (req, res) => res.json({ items: await inv.chickLots(req.farmCtx, q(req)) }));
  r.post("/chick-lots", ...farm("inventory.manage"), validate("body", ReceiveChicksRequest), async (req, res) => res.status(201).json(await inv.receiveChicks(req.farmCtx, req.body)));
  return r;
}
function feedRoutes(feed, farms) {
  const r = Router8({ mergeParams: true });
  const farm = (a) => [validate("params", z22.object({ farmId: Id })), requireFarm(farms), requirePermission(a)];
  r.post("/consumption", ...farm("inventory.issue"), validate("body", FeedConsumptionRequest), async (req, res) => res.status(201).json(await feed.consume(req.farmCtx, req.body)));
  r.get("/consumption", ...farm("inventory.read"), validate("query", FeedListQuery), async (req, res) => res.json({ items: await feed.list(req.farmCtx, q(req)) }));
  r.delete("/consumption/:id", validate("params", z22.object({ farmId: Id, id: Id })), requireFarm(farms), requirePermission("inventory.issue"), async (req, res) => {
    await feed.removeEntry(req.farmCtx, req.params["id"]);
    res.status(204).end();
  });
  r.get("/stock", ...farm("inventory.read"), async (req, res) => res.json(await feed.stock(req.farmCtx)));
  r.get("/analytics", ...farm("production.read"), validate("query", FeedAnalyticsQuery), async (req, res) => res.json(await feed.analytics(req.farmCtx, q(req))));
  return r;
}
function waterRoutes(feed, farms) {
  const r = Router8({ mergeParams: true });
  r.get("/", validate("params", z22.object({ farmId: Id })), requireFarm(farms), requirePermission("production.read"), validate("query", WaterListQuery), async (req, res) => res.json({ items: await feed.water(req.farmCtx, q(req)) }));
  return r;
}
function alertRoutes(alerts, farms, evaluate) {
  const r = Router8({ mergeParams: true });
  const farm = [validate("params", z22.object({ farmId: Id })), requireFarm(farms)];
  r.get("/", ...farm, requirePermission("farm.read"), validate("query", AlertsQuery), async (req, res) => res.json(await alerts.list(req.farmCtx, q(req))));
  r.post("/evaluate", ...farm, requirePermission("alert.manage"), async (req, res) => res.json({ evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(), rules: await evaluate(req.farmCtx) }));
  r.post("/:alertId/acknowledge", validate("params", z22.object({ farmId: Id, alertId: Id })), requireFarm(farms), requirePermission("alert.manage"), async (req, res) => {
    res.json(await alerts.acknowledge(req.farmCtx, req.params["alertId"]));
  });
  return r;
}

// src/http/routes/health.routes.ts
import { Router as Router9 } from "express";
import { z as z23 } from "zod";
var q2 = (req) => req.query;
var p = (req, k) => req.params[k];
function guard(farms) {
  return (action, extra = {}) => [validate("params", z23.object({ farmId: Id, ...extra })), requireFarm(farms), requirePermission(action)];
}
function healthRoutes(health, farms) {
  const r = Router9({ mergeParams: true });
  const g = guard(farms);
  r.get("/medicines", ...g("health.read"), async (req, res) => res.json({ items: await health.listMedicines(req.farmCtx) }));
  r.post("/medicines", ...g("health.manage"), validate("body", CreateMedicineRequest), async (req, res) => res.status(201).json(await health.createMedicine(req.farmCtx, req.body)));
  r.put("/medicines/:id", ...g("health.manage", { id: Id }), validate("body", UpdateMedicineRequest), async (req, res) => res.json(await health.updateMedicine(req.farmCtx, p(req, "id"), req.body)));
  r.get("/records", ...g("health.read"), validate("query", HealthRecordListQuery), async (req, res) => res.json({ items: await health.listRecords(req.farmCtx, q2(req)) }));
  r.post("/records", ...g("health.record_observation"), validate("body", CreateHealthRecordRequest), async (req, res) => res.status(201).json(await health.createRecord(req.farmCtx, req.body)));
  r.get("/records/:id", ...g("health.read", { id: Id }), async (req, res) => res.json(await health.getRecord(req.farmCtx, p(req, "id"))));
  r.put("/records/:id", ...g("health.record_observation", { id: Id }), validate("body", UpdateHealthRecordRequest), async (req, res) => res.json(await health.updateRecord(req.farmCtx, p(req, "id"), req.body)));
  r.delete("/records/:id", ...g("health.manage", { id: Id }), async (req, res) => {
    await health.deleteRecord(req.farmCtx, p(req, "id"));
    res.status(204).end();
  });
  r.post("/records/:id/follow-up-done", ...g("health.record_observation", { id: Id }), async (req, res) => res.json(await health.completeFollowUp(req.farmCtx, p(req, "id"))));
  r.get("/reminders", ...g("health.read"), validate("query", RemindersQuery), async (req, res) => res.json(await health.reminders(req.farmCtx, q2(req))));
  r.get("/withdrawals/:flockId", ...g("health.read", { flockId: Id }), async (req, res) => res.json(await health.withdrawals(req.farmCtx, p(req, "flockId"))));
  r.get("/programmes", ...g("health.read"), async (req, res) => res.json({ items: await health.listProgrammes(req.farmCtx) }));
  r.post("/programmes", ...g("health.manage"), validate("body", CreateProgrammeRequest), async (req, res) => res.status(201).json(await health.createProgramme(req.farmCtx, req.body)));
  r.post("/programmes/apply/:flockId", ...g("health.manage", { flockId: Id }), validate("body", ApplyProgrammeRequest), async (req, res) => res.status(201).json(await health.applyProgramme(req.farmCtx, p(req, "flockId"), req.body)));
  r.get("/vaccinations", ...g("health.read"), validate("query", VaccinationListQuery), async (req, res) => res.json({ items: await health.listVaccinations(req.farmCtx, q2(req)) }));
  r.post("/vaccinations", ...g("health.manage"), validate("body", ScheduleVaccinationRequest), async (req, res) => res.status(201).json(await health.scheduleVaccination(req.farmCtx, req.body)));
  r.post("/vaccinations/:id/administer", ...g("health.vaccinate", { id: Id }), validate("body", AdministerVaccinationRequest), async (req, res) => res.json(await health.administer(req.farmCtx, p(req, "id"), req.body)));
  r.post("/vaccinations/:id/skip", ...g("health.manage", { id: Id }), validate("body", SkipVaccinationRequest), async (req, res) => res.json(await health.skipVaccination(req.farmCtx, p(req, "id"), req.body.reason)));
  return r;
}
function biosecurityRoutes(bio, farms) {
  const r = Router9({ mergeParams: true });
  const g = guard(farms);
  r.get("/summary", ...g("biosecurity.read"), async (req, res) => res.json(await bio.summary(req.farmCtx)));
  r.get("/checklists", ...g("biosecurity.read"), validate("query", ChecklistTemplateQuery), async (req, res) => res.json({ items: await bio.listTemplates(req.farmCtx, q2(req)) }));
  r.post("/checklists", ...g("biosecurity.manage"), validate("body", CreateChecklistTemplateRequest), async (req, res) => res.status(201).json(await bio.createTemplate(req.farmCtx, req.body)));
  r.post("/checklists/starter", ...g("biosecurity.manage"), async (req, res) => res.status(201).json(await bio.addStarterTemplates(req.farmCtx)));
  r.put("/checklists/:id", ...g("biosecurity.manage", { id: Id }), validate("body", UpdateChecklistTemplateRequest), async (req, res) => res.json(await bio.updateTemplate(req.farmCtx, p(req, "id"), req.body)));
  r.get("/visitors", ...g("biosecurity.read"), validate("query", VisitorListQuery), async (req, res) => res.json({ items: await bio.listVisitors(req.farmCtx, q2(req)) }));
  r.post("/visitors", ...g("biosecurity.record"), validate("body", VisitorCheckInRequest), async (req, res) => res.status(201).json(await bio.checkIn(req.farmCtx, req.body)));
  r.post("/visitors/:id/check-out", ...g("biosecurity.record", { id: Id }), validate("body", VisitorCheckOutRequest), async (req, res) => res.json(await bio.checkOut(req.farmCtx, p(req, "id"), req.body.checkOutAt)));
  r.get("/logs", ...g("biosecurity.read"), validate("query", BiosecurityLogQuery), async (req, res) => res.json({ items: await bio.listLogs(req.farmCtx, q2(req)) }));
  r.post("/logs", ...g("biosecurity.record"), validate("body", BiosecurityLogRequest), async (req, res) => res.status(201).json(await bio.createLog(req.farmCtx, req.body)));
  r.get("/equipment", ...g("biosecurity.read"), async (req, res) => res.json({ items: await bio.listEquipment(req.farmCtx) }));
  r.post("/equipment", ...g("biosecurity.manage"), validate("body", EquipmentRequest), async (req, res) => res.status(201).json(await bio.createEquipment(req.farmCtx, req.body)));
  r.post("/equipment/:id/moves", ...g("biosecurity.record", { id: Id }), validate("body", EquipmentMoveRequest), async (req, res) => res.status(201).json(await bio.moveEquipment(req.farmCtx, p(req, "id"), req.body)));
  r.get("/cleaning-schedules", ...g("biosecurity.read"), async (req, res) => res.json({ items: await bio.listSchedules(req.farmCtx) }));
  r.post("/cleaning-schedules", ...g("biosecurity.manage"), validate("body", CleaningScheduleRequest), async (req, res) => res.status(201).json(await bio.createSchedule(req.farmCtx, req.body)));
  r.post("/cleaning-schedules/:id/complete", ...g("biosecurity.record", { id: Id }), validate("body", CompleteCleaningRequest), async (req, res) => res.status(201).json(await bio.completeSchedule(req.farmCtx, p(req, "id"), req.body)));
  r.get("/corrective-actions", ...g("biosecurity.read"), validate("query", ActionListQuery), async (req, res) => res.json({ items: await bio.listActions(req.farmCtx, q2(req)) }));
  r.post("/corrective-actions", ...g("biosecurity.record"), validate("body", CorrectiveActionRequest), async (req, res) => res.status(201).json(await bio.createAction(req.farmCtx, req.body)));
  r.post("/corrective-actions/:id/complete", ...g("biosecurity.record", { id: Id }), validate("body", CompleteActionRequest), async (req, res) => res.json(await bio.completeAction(req.farmCtx, p(req, "id"), req.body.resolutionNotes)));
  r.post("/corrective-actions/:id/verify", ...g("biosecurity.manage", { id: Id }), async (req, res) => res.json(await bio.verifyAction(req.farmCtx, p(req, "id"))));
  return r;
}
function contentRoutes(content, farms) {
  const r = Router9({ mergeParams: true });
  const g = guard(farms);
  r.get("/articles", ...g("content.read"), validate("query", ArticleListQuery), async (req, res) => res.json({ items: await content.list(req.farmCtx, q2(req)) }));
  r.get("/articles/:slug", ...g("content.read", { slug: z23.string().regex(/^[a-z0-9-]{1,120}$/) }), async (req, res) => res.json(await content.get(req.farmCtx, p(req, "slug"), req.query["locale"] ?? "en")));
  return r;
}

// src/http/routes/hatchery.routes.ts
import { Router as Router10 } from "express";
import { z as z24 } from "zod";
var q4 = (req) => req.query;
var p2 = (req, k) => req.params[k];
var guard2 = (farms) => (action, extra = {}) => [validate("params", z24.object({ farmId: Id, ...extra })), requireFarm(farms), requirePermission(action)];
function hatcheryRoutes(h, farms) {
  const r = Router10({ mergeParams: true });
  const g = guard2(farms);
  r.get("/summary", ...g("hatchery.read"), validate("query", HatcherySummaryQuery), async (req, res) => res.json(await h.summary(req.farmCtx, q4(req))));
  r.get("/batches", ...g("hatchery.read"), validate("query", BatchListQuery), async (req, res) => res.json({ items: await h.listBatches(req.farmCtx, q4(req)) }));
  r.post("/batches", ...g("hatchery.manage"), validate("body", CreateHatcheryBatchRequest), async (req, res) => res.status(201).json(await h.createBatch(req.farmCtx, req.body)));
  r.get("/batches/:id", ...g("hatchery.read", { id: Id }), async (req, res) => res.json(await h.getBatch(req.farmCtx, p2(req, "id"))));
  r.post("/batches/:id/candling", ...g("hatchery.record", { id: Id }), validate("body", CandlingRequest), async (req, res) => res.status(201).json(await h.recordCandling(req.farmCtx, p2(req, "id"), req.body)));
  r.post("/batches/:id/transfer", ...g("hatchery.record", { id: Id }), validate("body", TransferToHatcherRequest), async (req, res) => res.status(201).json(await h.recordTransfer(req.farmCtx, p2(req, "id"), req.body)));
  r.post("/batches/:id/hatch", ...g("hatchery.record", { id: Id }), validate("body", HatchRequest), async (req, res) => res.status(201).json(await h.recordHatch(req.farmCtx, p2(req, "id"), req.body)));
  r.post("/batches/:id/grading", ...g("hatchery.record", { id: Id }), validate("body", GradingRequest), async (req, res) => res.status(201).json(await h.recordGrading(req.farmCtx, p2(req, "id"), req.body)));
  r.post("/batches/:id/readings", ...g("hatchery.record", { id: Id }), validate("body", MachineReadingRequest), async (req, res) => res.status(201).json(await h.recordReading(req.farmCtx, p2(req, "id"), req.body)));
  r.post("/batches/:id/reverse", ...g("hatchery.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.status(201).json(await h.reverseLatest(req.farmCtx, p2(req, "id"), req.body.reason)));
  r.post("/batches/:id/cancel", ...g("hatchery.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await h.cancelBatch(req.farmCtx, p2(req, "id"), req.body.reason)));
  return r;
}
function chickOrderRoutes(h, farms) {
  const g = guard2(farms);
  const buyers = Router10({ mergeParams: true });
  buyers.get("/", ...g("market.read"), async (req, res) => res.json({ items: await h.listBuyers(req.farmCtx) }));
  buyers.post("/", ...g("market.manage"), validate("body", BuyerRequest), async (req, res) => res.status(201).json(await h.createBuyer(req.farmCtx, req.body)));
  const orders = Router10({ mergeParams: true });
  orders.get("/", ...g("market.read"), validate("query", OrderListQuery), async (req, res) => res.json({ items: await h.listOrders(req.farmCtx, q4(req)) }));
  orders.post("/", ...g("market.manage"), validate("body", ChickOrderRequest), async (req, res) => res.status(201).json(await h.createChickOrder(req.farmCtx, req.body)));
  return { buyers, orders };
}
function chickStartRoutes(c, farms) {
  const r = Router10({ mergeParams: true });
  const g = guard2(farms);
  r.get("/profiles", ...g("production.read"), async (req, res) => res.json({ items: await c.listProfiles(req.farmCtx) }));
  r.post("/profiles", ...g("flock.manage"), validate("body", BroodingProfileRequest), async (req, res) => res.status(201).json(await c.createProfile(req.farmCtx, req.body)));
  r.get("/arrivals", ...g("production.read"), validate("query", ArrivalListQuery), async (req, res) => res.json({ items: await c.listArrivals(req.farmCtx, q4(req)) }));
  r.post("/arrivals", ...g("flock.manage"), validate("body", PlanArrivalRequest), async (req, res) => res.status(201).json(await c.planArrival(req.farmCtx, req.body)));
  r.post("/arrivals/:id/preparation", ...g("production.record", { id: Id }), validate("body", PreparationRequest), async (req, res) => res.json(await c.completePreparation(req.farmCtx, p2(req, "id"), req.body.checklist)));
  r.post("/arrivals/:id/arrive", ...g("flock.manage", { id: Id }), validate("body", ArriveRequest), async (req, res) => res.status(201).json(await c.arrive(req.farmCtx, p2(req, "id"), req.body)));
  r.post("/arrivals/:id/cancel", ...g("flock.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await c.cancelArrival(req.farmCtx, p2(req, "id"), req.body.reason)));
  r.post("/checks", ...g("production.record"), validate("body", BrooderCheckRequest), async (req, res) => res.status(201).json(await c.recordCheck(req.farmCtx, req.body)));
  r.get("/flocks/:flockId", ...g("production.read", { flockId: Id }), validate("query", BroodingViewQuery), async (req, res) => res.json(await c.broodingView(req.farmCtx, p2(req, "flockId"), q4(req))));
  return r;
}
function calendarRoutes(cal, farms) {
  const r = Router10({ mergeParams: true });
  const g = guard2(farms);
  r.get("/", ...g("farm.read"), validate("query", CalendarQuery), async (req, res) => res.json(await cal.events(req.farmCtx, q4(req))));
  r.get("/ics", ...g("farm.read"), validate("query", CalendarQuery), async (req, res) => {
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="poultrypilot.ics"');
    res.send(await cal.ics(req.farmCtx, q4(req)));
  });
  return r;
}

// src/http/routes/finance.routes.ts
import { Router as Router11 } from "express";
import { z as z25 } from "zod";
var q5 = (req) => req.query;
var p3 = (req, k) => req.params[k];
var guard3 = (farms) => (action, extra = {}) => [validate("params", z25.object({ farmId: Id, ...extra })), requireFarm(farms), requirePermission(action)];
var ctxOf2 = (req) => ({ userId: req.auth.userId, sessionId: req.auth.sessionId, requestId: req.id });
function financeRoutes(f, farms) {
  const r = Router11({ mergeParams: true });
  const g = guard3(farms);
  r.get("/suppliers", ...g("money.read"), async (req, res) => res.json({ items: await f.listSuppliers(req.farmCtx) }));
  r.post("/suppliers", ...g("money.record"), validate("body", SupplierRequest), async (req, res) => res.status(201).json(await f.createSupplier(req.farmCtx, req.body)));
  r.get("/suppliers/:id", ...g("money.read", { id: Id }), async (req, res) => res.json(await f.supplierStatement(req.farmCtx, p3(req, "id"))));
  r.get("/accounts", ...g("money.read"), async (req, res) => res.json({ items: await f.listAccounts(req.farmCtx) }));
  r.post("/accounts", ...g("money.record"), validate("body", MoneyAccountRequest), async (req, res) => res.status(201).json(await f.createAccount(req.farmCtx, req.body)));
  r.post("/transfers", ...g("money.record"), validate("body", TransferRequestMoney), async (req, res) => res.status(201).json(await f.transfer(req.farmCtx, req.body)));
  r.get("/ledger", ...g("money.read"), validate("query", LedgerQuery), async (req, res) => res.json({ items: await f.ledger(req.farmCtx, q5(req)) }));
  for (const [path, type, schema] of [["expenses", "expense", ExpenseRequest], ["incomes", "income", IncomeRequest]]) {
    r.get(`/${path}`, ...g("money.read"), validate("query", DocumentListQuery), async (req, res) => res.json({ items: await f.listDocuments(req.farmCtx, type, q5(req)) }));
    r.post(`/${path}`, ...g("money.record"), validate("body", schema), async (req, res) => res.status(201).json(type === "expense" ? await f.createExpense(req.farmCtx, req.body) : await f.createIncome(req.farmCtx, req.body)));
    r.get(`/${path}/:id`, ...g("money.read", { id: Id }), async (req, res) => res.json(await f.getDocument(req.farmCtx, type, p3(req, "id"))));
    r.post(`/${path}/:id/payments`, ...g("payment.record", { id: Id }), validate("body", PaymentRequest), async (req, res) => res.status(201).json(await f.pay(req.farmCtx, type, p3(req, "id"), req.body)));
    r.post(`/${path}/:id/refunds`, ...g("money.record", { id: Id }), validate("body", RefundRequest), async (req, res) => res.status(201).json(await f.refund(req.farmCtx, type, p3(req, "id"), req.body)));
    r.post(`/${path}/:id/cancel`, ...g("money.delete", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await f.cancel(req.farmCtx, type, p3(req, "id"), req.body.reason)));
  }
  r.get("/recurring", ...g("money.read"), async (req, res) => res.json({ items: await f.listRecurring(req.farmCtx) }));
  r.post("/recurring", ...g("money.record"), validate("body", RecurringExpenseRequest), async (req, res) => res.status(201).json(await f.createRecurring(req.farmCtx, req.body)));
  r.post("/recurring/generate", ...g("money.record"), async (req, res) => res.json(await f.generateDue(req.farmCtx)));
  r.post("/recurring/:id/pause", ...g("money.record", { id: Id }), validate("body", PauseRequest), async (req, res) => res.json(await f.pauseRecurring(req.farmCtx, p3(req, "id"), req.body)));
  r.get("/reports/pnl", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.profitAndLoss(req.farmCtx, q5(req))));
  r.get("/reports/cash-flow", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.cashFlow(req.farmCtx, q5(req))));
  r.get("/reports/expenses", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.expenseBreakdown(req.farmCtx, q5(req))));
  r.get("/reports/revenue", ...g("money.read"), validate("query", PeriodQuery), async (req, res) => res.json(await f.revenueBreakdown(req.farmCtx, q5(req))));
  r.get("/reports/receivables", ...g("money.read"), async (req, res) => res.json(await f.openItems(req.farmCtx, "income")));
  r.get("/reports/payables", ...g("money.read"), async (req, res) => res.json(await f.openItems(req.farmCtx, "expense")));
  r.get("/reports/flock-profitability", ...g("money.read"), validate("query", ProfitabilityQuery), async (req, res) => res.json(await f.flockProfitability(req.farmCtx, q5(req))));
  r.get("/reports/house-costing", ...g("money.read"), validate("query", OptionalPeriodQuery), async (req, res) => res.json(await f.houseCosting(req.farmCtx, q5(req))));
  return r;
}
function sellerMarketRoutes(m, farms) {
  const r = Router11({ mergeParams: true });
  const g = guard3(farms);
  r.get("/listings", ...g("market.read"), validate("query", MyListingsQuery), async (req, res) => res.json({ items: await m.myListings(req.farmCtx, q5(req)) }));
  r.post("/listings", ...g("market.manage"), validate("body", ListingRequest), async (req, res) => res.status(201).json(await m.createListing(req.farmCtx, req.body)));
  r.put("/listings/:id", ...g("market.manage", { id: Id }), validate("body", UpdateListingRequest), async (req, res) => res.json(await m.updateListing(req.farmCtx, p3(req, "id"), req.body)));
  r.post("/listings/:id/status", ...g("market.manage", { id: Id }), validate("body", ListingStatusRequest), async (req, res) => res.json(await m.setListingStatus(req.farmCtx, p3(req, "id"), req.body.status)));
  r.get("/orders", ...g("market.read"), validate("query", OrderListQueryMarket), async (req, res) => res.json({ items: await m.sellerOrders(req.farmCtx, q5(req)) }));
  r.get("/orders/:id", ...g("market.read", { id: Id }), async (req, res) => res.json(await m.sellerOrder(req.farmCtx, p3(req, "id"))));
  r.post("/orders/:id/accept", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "accepted")));
  r.post("/orders/:id/prepare", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "preparing")));
  r.post("/orders/:id/dispatch", ...g("market.manage", { id: Id }), validate("body", DispatchRequest), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "dispatched", { delivery: req.body })));
  r.post("/orders/:id/deliver", ...g("market.manage", { id: Id }), validate("body", DeliveredRequest), async (req, res) => {
    const { date, ...delivery } = req.body;
    res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "delivered", { delivery, ...date ? { date } : {} }));
  });
  r.post("/orders/:id/complete", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "completed")));
  r.post("/orders/:id/cancel", ...g("market.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "cancelled", { reason: req.body.reason })));
  r.post("/orders/:id/payments", ...g("payment.record", { id: Id }), validate("body", PaymentRequest), async (req, res) => res.status(201).json(await m.recordPayment(req.farmCtx, p3(req, "id"), req.body)));
  r.post("/orders/:id/refunds", ...g("money.record", { id: Id }), validate("body", RefundRequest), async (req, res) => {
    const { reason, ...rest } = req.body;
    res.status(201).json(await m.recordRefund(req.farmCtx, p3(req, "id"), { ...rest, note: reason }));
  });
  return r;
}
function chickOrderActions(m, farms) {
  const g = guard3(farms);
  const orders = Router11({ mergeParams: true });
  orders.post("/:id/confirm", ...g("market.manage", { id: Id }), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "accepted")));
  orders.post("/:id/cancel", ...g("market.manage", { id: Id }), validate("body", ReasonRequest), async (req, res) => res.json(await m.sellerAct(req.farmCtx, p3(req, "id"), "cancelled", { reason: req.body.reason })));
  orders.post("/:id/deliver", ...g("market.manage", { id: Id }), validate("body", DeliverOrderRequest), async (req, res) => {
    const order = await m.sellerAct(req.farmCtx, p3(req, "id"), "delivered", { date: req.body.date });
    res.json({ order });
  });
  orders.post("/:id/payments", ...g("payment.record", { id: Id }), validate("body", PaymentRequest), async (req, res) => res.status(201).json(await m.recordPayment(req.farmCtx, p3(req, "id"), req.body)));
  const buyers = Router11({ mergeParams: true });
  buyers.get("/:id", ...g("market.read", { id: Id }), async (req, res) => res.json(await m.buyerDetail(req.farmCtx, p3(req, "id"))));
  buyers.put("/:id", ...g("market.manage", { id: Id }), validate("body", BuyerUpdateRequest), async (req, res) => res.json(await m.updateBuyer(req.farmCtx, p3(req, "id"), req.body)));
  return { orders, buyers };
}
function buyerMarketRoutes(m) {
  const r = Router11();
  r.get("/listings", validate("query", BrowseQuery), async (req, res) => res.json({ items: await m.browse(ctxOf2(req), q5(req)) }));
  r.get("/listings/:id", validate("params", z25.object({ id: Id })), async (req, res) => res.json(await m.listing(ctxOf2(req), p3(req, "id"))));
  r.post("/orders", validate("body", PlaceOrderRequest), async (req, res) => res.status(201).json(await m.placeOrder(ctxOf2(req), req.body)));
  r.get("/orders", async (req, res) => res.json({ items: await m.myPurchases(ctxOf2(req)) }));
  r.get("/orders/:id", validate("params", z25.object({ id: Id })), async (req, res) => res.json(await m.buyerOrder(ctxOf2(req), p3(req, "id"))));
  r.post("/orders/:id/cancel", validate("params", z25.object({ id: Id })), validate("body", ReasonRequest), async (req, res) => res.json(await m.buyerAct(ctxOf2(req), p3(req, "id"), "cancelled", req.body.reason)));
  r.post("/orders/:id/received", validate("params", z25.object({ id: Id })), async (req, res) => res.json(await m.buyerAct(ctxOf2(req), p3(req, "id"), "delivered")));
  r.post("/orders/:id/complete", validate("params", z25.object({ id: Id })), async (req, res) => res.json(await m.buyerAct(ctxOf2(req), p3(req, "id"), "completed")));
  return r;
}

// src/http/routes/intelligence.routes.ts
import { Router as Router12 } from "express";
import { z as z26 } from "zod";
var q6 = (req) => req.query;
var p4 = (req, k) => req.params[k];
var ctxOf3 = (req) => ({ userId: req.auth.userId, sessionId: req.auth.sessionId, requestId: req.id });
function intelligenceRoutes(s2, farms) {
  const r = Router12({ mergeParams: true });
  const farm = [validate("params", z26.object({ farmId: Id }).passthrough()), requireFarm(farms)];
  r.get("/dashboard", ...farm, requirePermission("farm.read"), async (req, res) => res.json(await s2.dashboard.overview(req.farmCtx)));
  r.get("/analytics", ...farm, requirePermission("production.read"), validate("query", AnalyticsQuery), async (req, res) => res.json(await s2.dashboard.analytics(req.farmCtx, q6(req))));
  r.get("/weather", ...farm, requirePermission("farm.read"), validate("query", WeatherQuery), async (req, res) => res.json(await s2.weather.get(req.farmCtx, q6(req))));
  r.get("/alert-rules", ...farm, requirePermission("farm.read"), async (req, res) => res.json({ items: await s2.rules.list(req.farmCtx) }));
  r.put("/alert-rules/:ruleKey", validate("params", z26.object({ farmId: Id, ruleKey: RuleKey })), requireFarm(farms), requirePermission("alert.manage"), validate("body", AlertRuleUpdateRequest), async (req, res) => res.json(await s2.rules.update(req.farmCtx, p4(req, "ruleKey"), req.body)));
  r.delete("/alert-rules/:ruleKey", validate("params", z26.object({ farmId: Id, ruleKey: RuleKey })), requireFarm(farms), requirePermission("alert.manage"), async (req, res) => res.json(await s2.rules.reset(req.farmCtx, p4(req, "ruleKey"))));
  return r;
}
function appointmentRoutes(health, farms) {
  const r = Router12({ mergeParams: true });
  const farm = [validate("params", z26.object({ farmId: Id })), requireFarm(farms)];
  r.get("/", ...farm, requirePermission("health.read"), validate("query", AppointmentListQuery), async (req, res) => res.json({ items: await health.listAppointments(req.farmCtx, q6(req)) }));
  r.post("/", ...farm, requirePermission("health.manage"), validate("body", AppointmentRequest), async (req, res) => res.status(201).json(await health.bookAppointment(req.farmCtx, req.body)));
  r.post("/:id/complete", validate("params", z26.object({ farmId: Id, id: Id })), requireFarm(farms), requirePermission("health.manage"), validate("body", CompleteAppointmentRequest), async (req, res) => res.json(await health.completeAppointment(req.farmCtx, p4(req, "id"), req.body.notes)));
  return r;
}
function myNotificationRoutes(n) {
  const inbox = Router12();
  inbox.get("/", validate("query", NotificationListQuery), async (req, res) => res.json(await n.inbox(ctxOf3(req), q6(req))));
  inbox.post("/read", validate("body", MarkReadRequest), async (req, res) => res.json(await n.markRead(ctxOf3(req), req.body.ids)));
  inbox.post("/read-all", async (req, res) => res.json(await n.markRead(ctxOf3(req), "all")));
  const devices = Router12();
  devices.post("/", validate("body", PushDeviceRequest), async (req, res) => res.status(201).json(await n.registerDevice(ctxOf3(req), req.body)));
  devices.delete("/:id", validate("params", z26.object({ id: Id })), async (req, res) => {
    await n.removeDevice(ctxOf3(req), p4(req, "id"));
    res.status(204).end();
  });
  const preferences = Router12();
  preferences.get("/", async (req, res) => res.json(await n.preferences(ctxOf3(req))));
  preferences.put("/", validate("body", NotificationPreferencesRequest), async (req, res) => res.json(await n.setPreferences(ctxOf3(req), req.body)));
  return { inbox, devices, preferences };
}

// src/jobs/alert-job.ts
var systemContext = (farmId) => ({ userId: "system", farmId, role: "owner", membershipId: "system" });
async function runFarmChecks(c, ctx) {
  return c.repos.tx.run(async (tx) => {
    await c.alerts.evaluateInventory(ctx, tx);
    await c.flockHealth.evaluateAlerts(ctx, tx);
    await c.hatchery.evaluateAlerts(ctx, tx);
    await c.finance.runScheduled(ctx, tx);
    await c.notifications?.notifyTasksDue(ctx, tx);
    return c.intelligence.evaluate(ctx, tx);
  });
}
async function runAlertJob(c, logger) {
  await c.weather.refreshAll().catch((err) => logger?.error({ err }, "weather refresh failed"));
  const ids = await c.repos.farms.listIds();
  let failed = 0;
  for (const farmId of ids) {
    try {
      await runFarmChecks(c, systemContext(farmId));
    } catch (err) {
      failed++;
      logger?.error({ err, farmId }, "alert job failed for farm");
    }
  }
  return { farms: ids.length, failed };
}
function scheduleAlertJob(c, logger, everyMs = 60 * 60 * 1e3) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await runAlertJob(c, logger);
      logger.info(r, "alert job finished");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
function scheduleDelivery(c, logger, everyMs = 3e4) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const r = await c.notifications.deliverDue();
      if (r.sent || r.failed || r.retrying) logger.info(r, "notifications delivered");
    } catch (err) {
      logger.error({ err }, "notification delivery failed");
    } finally {
      running = false;
    }
  }, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
function scheduleNewsImport(c, feeds, logger, everyMs = 6 * 36e5) {
  if (!feeds.length) return () => {
  };
  const run = async () => {
    const { fetchFeed } = await import("./news-feed-AF7ESRLV.js");
    for (const f of feeds) {
      try {
        const items = await fetchFeed(f);
        const r = await c.content.importExternal(null, items.map((i) => ({ title: i.title, sourceUrl: i.link, source: f.source, regionCode: f.regionCode, category: f.category, ...i.summary ? { summary: i.summary } : {}, ...i.publicationDate ? { publicationDate: i.publicationDate } : {}, ...i.author ? { author: i.author } : {} })));
        logger.info({ feed: f.url, ...r }, "news feed imported");
      } catch (err) {
        logger.error({ err, feed: f.url }, "news feed import failed");
      }
    }
  };
  void run();
  const timer = setInterval(() => void run(), everyMs);
  timer.unref();
  return () => clearInterval(timer);
}

// src/http/routes/content.routes.ts
import { Router as Router13 } from "express";
var q7 = (req) => req.query;
var p5 = (req, k) => req.params[k];
var ctxOf4 = (req) => ({ userId: req.auth.userId, sessionId: req.auth.sessionId, requestId: req.id });
var locale = (req) => req.query["locale"] ?? "en";
function readerContentRoutes(c) {
  const r = Router13();
  r.get("/articles", validate("query", ContentArticleQuery), async (req, res) => res.json({ items: await c.listArticles(ctxOf4(req), q7(req)) }));
  r.get("/articles/:slug", validate("params", SlugParams), validate("query", LocaleQuery), async (req, res) => res.json(await c.getArticle(ctxOf4(req), p5(req, "slug"), locale(req))));
  r.get("/news", validate("query", NewsQuery), async (req, res) => res.json({ items: await c.news(ctxOf4(req), q7(req)) }));
  r.get("/facts/today", validate("query", FactQuery), async (req, res) => res.json({ fact: await c.factOfTheDay(ctxOf4(req), q7(req)) }));
  r.get("/glossary", validate("query", GlossaryQuery), async (req, res) => res.json({ items: await c.glossary(ctxOf4(req), q7(req)) }));
  r.get("/courses", validate("query", CourseQuery), async (req, res) => res.json({ items: await c.courses(ctxOf4(req), q7(req)) }));
  r.get("/courses/:slug", validate("params", SlugParams), validate("query", LocaleQuery), async (req, res) => res.json(await c.course(ctxOf4(req), p5(req, "slug"), locale(req))));
  r.post("/courses/:slug/lessons/:lessonId/complete", validate("params", LessonParams), validate("query", LocaleQuery), async (req, res) => res.json(await c.completeLesson(ctxOf4(req), p5(req, "slug"), p5(req, "lessonId"), locale(req))));
  return r;
}
function editorialContentRoutes(c) {
  const r = Router13();
  r.get("/articles", validate("query", EditorArticleQuery), async (req, res) => res.json({ items: await c.editorList(ctxOf4(req), q7(req)) }));
  r.post("/articles", validate("body", ArticleRequest), async (req, res) => res.status(201).json(await c.createArticle(ctxOf4(req), req.body)));
  r.get("/articles/:id", validate("params", IdParams), async (req, res) => res.json(await c.editorGet(ctxOf4(req), p5(req, "id"))));
  r.put("/articles/:id", validate("params", IdParams), validate("body", UpdateArticleRequest), async (req, res) => res.json(await c.updateArticle(ctxOf4(req), p5(req, "id"), req.body)));
  r.post("/articles/:id/submit", validate("params", IdParams), async (req, res) => res.json(await c.submit(ctxOf4(req), p5(req, "id"))));
  r.post("/articles/:id/publish", validate("params", IdParams), async (req, res) => res.json(await c.publish(ctxOf4(req), p5(req, "id"))));
  r.post("/articles/:id/reject", validate("params", IdParams), validate("body", RejectRequest), async (req, res) => res.json(await c.reject(ctxOf4(req), p5(req, "id"), req.body.reason)));
  r.post("/articles/:id/archive", validate("params", IdParams), async (req, res) => res.json(await c.archive(ctxOf4(req), p5(req, "id"))));
  r.post("/import", validate("body", ImportRequest), async (req, res) => res.status(201).json(await c.importExternal(ctxOf4(req), req.body.items, req.body.kind)));
  r.put("/glossary", validate("body", GlossaryRequest), async (req, res) => res.json(await c.upsertGlossary(ctxOf4(req), req.body)));
  r.put("/courses", validate("body", CourseRequest), async (req, res) => res.json(await c.upsertCourse(ctxOf4(req), req.body)));
  return r;
}

// src/http/routes/report.routes.ts
import { Router as Router14 } from "express";
import { z as z27 } from "zod";

// src/adapters/report-renderers.ts
import { existsSync } from "fs";
import { resolve as resolve2 } from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
var csvCell = (v) => {
  if (v === null || v === void 0) return "";
  if (typeof v === "number") return String(v);
  const s2 = safeText(v);
  return /[",\n\r]/.test(s2) ? `"${s2.replace(/"/g, '""')}"` : s2;
};
function renderCsv(doc) {
  const lines = [];
  const row = (cells) => lines.push(cells.map(csvCell).join(","));
  row([doc.title]);
  row(["Farm", doc.farmName]);
  if (doc.period) row(["Period", `${doc.period.from} to ${doc.period.to}`]);
  row(["Generated", doc.generatedAt]);
  row(["Generated by", doc.generatedBy]);
  row(["Currency", doc.currency]);
  for (const s2 of doc.sections) {
    lines.push("");
    row([s2.title]);
    if (s2.kind === "summary") {
      for (const it of s2.items) row([it.label, sheetValue(it.value, it.type)]);
    } else {
      row(s2.columns.map((c) => c.type === "money" ? `${c.label} (${doc.currency})` : c.type === "percent" ? `${c.label} (%)` : c.label));
      for (const r of s2.rows) row(s2.columns.map((c) => sheetValue(r[c.key] ?? null, c.type)));
      if (s2.totals) row(s2.columns.map((c, i) => i === 0 && s2.totals[c.key] === void 0 ? "Total" : sheetValue(s2.totals[c.key] ?? null, c.type)));
    }
  }
  if (doc.notes.length) {
    lines.push("");
    row(["Notes"]);
    for (const n of doc.notes) row([n]);
  }
  return Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from(lines.join("\r\n") + "\r\n", "utf8")]);
}
async function renderXlsx(doc) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PoultryPilot";
  wb.created = new Date(doc.generatedAt);
  const used = /* @__PURE__ */ new Set();
  const sheetName = (t) => {
    let base = t.replace(/[[\]:*?/\\]/g, " ").slice(0, 28).trim() || "Sheet";
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 25)} ${n}`;
    used.add(name.toLowerCase());
    return name;
  };
  const fmt = (type, decimals) => type === "money" ? "#,##0.00" : type === "percent" ? `0.${"0".repeat(decimals ?? 1)}` : type === "number" ? decimals ? `#,##0.${"0".repeat(decimals)}` : "#,##0.##" : void 0;
  const text = (v) => typeof v === "string" ? safeText(v) : v;
  const summary = wb.addWorksheet(sheetName("Summary"));
  summary.columns = [{ width: 34 }, { width: 40 }];
  const meta = [[doc.title, null], ["Farm", doc.farmName], ...doc.period ? [["Period", `${doc.period.from} to ${doc.period.to}`]] : [], ["Generated", doc.generatedAt], ["Generated by", doc.generatedBy], ["Currency", doc.currency]];
  for (const [k, v] of meta) summary.addRow([k, text(v)]);
  summary.getRow(1).font = { bold: true, size: 14 };
  for (const s2 of doc.sections.filter((x) => x.kind === "summary")) {
    summary.addRow([]);
    summary.addRow([s2.title]).font = { bold: true };
    for (const it of s2.items) {
      const r = summary.addRow([it.label, text(sheetValue(it.value, it.type))]);
      const f = fmt(it.type, it.decimals);
      if (f && typeof it.value === "number") r.getCell(2).numFmt = f;
    }
  }
  if (doc.notes.length) {
    summary.addRow([]);
    summary.addRow(["Notes"]).font = { bold: true };
    for (const n of doc.notes) summary.addRow([text(n)]);
  }
  for (const t of doc.sections.filter((x) => x.kind === "table")) {
    const ws = wb.addWorksheet(sheetName(t.title));
    ws.columns = t.columns.map((c) => ({ header: c.type === "money" ? `${c.label} (${doc.currency})` : c.type === "percent" ? `${c.label} (%)` : c.label, key: c.key, width: Math.min(40, Math.max(10, c.label.length + 4)) }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of t.rows) ws.addRow(Object.fromEntries(t.columns.map((c) => [c.key, text(sheetValue(r[c.key] ?? null, c.type))])));
    if (t.totals) {
      const tr = ws.addRow(Object.fromEntries(t.columns.map((c, i) => [c.key, i === 0 && t.totals[c.key] === void 0 ? "Total" : text(sheetValue(t.totals[c.key] ?? null, c.type))])));
      tr.font = { bold: true };
    }
    t.columns.forEach((c, i) => {
      const f = fmt(c.type, c.decimals);
      if (f) ws.getColumn(i + 1).numFmt = f;
    });
    if (t.note) ws.addRow([]).getCell(1).value = text(t.note);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
function fontPaths() {
  const candidates = [resolve2(process.cwd(), "assets/fonts"), resolve2(process.cwd(), "services/api/assets/fonts"), process.env["FONT_DIR"] ?? ""].filter(Boolean);
  for (const dir of candidates) {
    const regular = resolve2(dir, "DejaVuSans.ttf");
    const bold = resolve2(dir, "DejaVuSans-Bold.ttf");
    if (existsSync(regular) && existsSync(bold)) return { regular, bold };
  }
  return null;
}
function renderPdf(doc) {
  return new Promise((resolvePdf, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, info: { Title: doc.title, Author: "PoultryPilot", Subject: doc.farmName } });
    const chunks = [];
    pdf.on("data", (c) => chunks.push(c));
    pdf.on("end", () => resolvePdf(Buffer.concat(chunks)));
    pdf.on("error", reject);
    const fonts = fontPaths();
    if (fonts) {
      pdf.registerFont("body", fonts.regular);
      pdf.registerFont("bold", fonts.bold);
    }
    const body = fonts ? "body" : "Helvetica";
    const bold = fonts ? "bold" : "Helvetica-Bold";
    const left = pdf.page.margins.left;
    const width = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
    const bottom = () => pdf.page.height - pdf.page.margins.bottom - 20;
    const ensure = (h) => {
      if (pdf.y + h > bottom()) pdf.addPage();
    };
    pdf.font(bold).fontSize(18).text(doc.title);
    pdf.font(body).fontSize(10).fillColor("#444").text(`${doc.farmName}${doc.period ? `  \xB7  ${doc.period.from} to ${doc.period.to}` : ""}`);
    pdf.text(`Generated ${doc.generatedAt.replace("T", " ").slice(0, 16)} UTC by ${doc.generatedBy}  \xB7  Amounts in ${doc.currency}`).fillColor("black");
    pdf.moveDown();
    for (const s2 of doc.sections) {
      ensure(40);
      pdf.font(bold).fontSize(12).text(s2.title, left);
      pdf.moveDown(0.3);
      if (s2.kind === "summary") {
        pdf.fontSize(9);
        for (const it of s2.items) {
          ensure(14);
          const y = pdf.y;
          pdf.font(body).text(it.label, left, y, { width: width * 0.55 });
          pdf.font(bold).text(formatCell(it.value, it.type, doc.currency, it.decimals), left + width * 0.55, y, { width: width * 0.45, align: "right" });
          pdf.y = Math.max(pdf.y, y + 12);
        }
        pdf.moveDown(0.8);
        continue;
      }
      const fixed = (t) => t === "text" ? 0 : t === "date" ? 62 : t === "money" ? 78 : 54;
      const fixedTotal = s2.columns.reduce((t, c) => t + fixed(c.type), 0);
      const textCols = s2.columns.filter((c) => c.type === "text").length;
      const free = Math.max(60, width - fixedTotal);
      const widths = s2.columns.map((c) => c.type === "text" ? free / Math.max(1, textCols) : fixed(c.type));
      const scale = Math.min(1, width / widths.reduce((t, w2) => t + w2, 0));
      const w = widths.map((x) => x * scale);
      const rowH = 14;
      const header = () => {
        ensure(rowH * 2);
        const y = pdf.y;
        pdf.rect(left, y - 2, width, rowH).fill("#e8ece8").fillColor("black");
        let x = left;
        pdf.font(bold).fontSize(7.5);
        s2.columns.forEach((c, i) => {
          pdf.text(c.label, x + 2, y + 1, { width: w[i] - 4, align: c.type === "text" || c.type === "date" ? "left" : "right", lineBreak: false, ellipsis: true });
          x += w[i];
        });
        pdf.y = y + rowH;
      };
      header();
      const line = (r, isTotal, shade) => {
        if (pdf.y + rowH > bottom()) {
          pdf.addPage();
          header();
        }
        const y = pdf.y;
        if (shade) pdf.rect(left, y - 2, width, rowH).fill("#f6f7f6").fillColor("black");
        let x = left;
        pdf.font(isTotal ? bold : body).fontSize(7.5);
        s2.columns.forEach((c, i) => {
          const v = isTotal && i === 0 && r[c.key] === void 0 ? "Total" : formatCell(r[c.key] ?? null, c.type, doc.currency, c.decimals);
          pdf.text(v, x + 2, y + 1, { width: w[i] - 4, align: c.type === "text" || c.type === "date" ? "left" : "right", lineBreak: false, ellipsis: true });
          x += w[i];
        });
        pdf.y = y + rowH;
      };
      if (!s2.rows.length) pdf.font(body).fontSize(8).fillColor("#666").text("No records in this period.", left).fillColor("black");
      s2.rows.forEach((r, i) => line(r, false, i % 2 === 1));
      if (s2.totals) line(s2.totals, true, false);
      if (s2.note) pdf.font(body).fontSize(7.5).fillColor("#555").text(s2.note, left, pdf.y + 2, { width }).fillColor("black");
      pdf.moveDown(0.8);
    }
    if (doc.notes.length) {
      ensure(30);
      pdf.font(bold).fontSize(10).text("Notes", left);
      pdf.font(body).fontSize(8);
      for (const n of doc.notes) pdf.text(`\u2022 ${n}`, left, pdf.y, { width });
    }
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      pdf.font(body).fontSize(7).fillColor("#777").text(`PoultryPilot \xB7 ${doc.title} \xB7 ${doc.farmName} \xB7 page ${i + 1} of ${range.count}`, left, pdf.page.height - pdf.page.margins.bottom + 10, { width, align: "center", lineBreak: false });
    }
    pdf.end();
  });
}
async function renderReport(doc, format) {
  if (format === "csv") return { bytes: renderCsv(doc), contentType: "text/csv; charset=utf-8", extension: "csv" };
  if (format === "xlsx") return { bytes: await renderXlsx(doc), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
  return { bytes: await renderPdf(doc), contentType: "application/pdf", extension: "pdf" };
}

// src/services/house.service.ts
var toHouseView = (h) => ({
  id: h.id,
  name: h.name,
  type: h.type,
  ...h.capacityBirds !== void 0 ? { capacityBirds: h.capacityBirds } : {},
  ...h.floorAreaM2 !== void 0 ? { floorAreaM2: h.floorAreaM2 } : {},
  status: h.status,
  ...h.notes ? { notes: h.notes } : {},
  version: h.version,
  createdAt: h.createdAt.toISOString(),
  updatedAt: h.updatedAt.toISOString()
});
var duplicate = (what) => (e) => {
  if (e.code === 11e3) throw new AppError("DUPLICATE", `${what} is already used on this farm`);
  throw e;
};
function createHouseService(d) {
  const { repos, clock } = d;
  return {
    async list(ctx) {
      assertCan(ctx, "production.read");
      return (await repos.houses.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(toHouseView);
    },
    async get(ctx, id) {
      assertCan(ctx, "production.read");
      const h = await repos.houses.findById(ctx.farmId, id);
      if (!h) throw notFound("House");
      return toHouseView(h);
    },
    async create(ctx, input) {
      assertCan(ctx, "flock.manage");
      const now = clock.now();
      const rec = {
        id: input.id ?? newId(),
        farmId: ctx.farmId,
        name: input.name,
        type: input.type,
        ...input.capacityBirds !== void 0 ? { capacityBirds: input.capacityBirds } : {},
        ...input.floorAreaM2 !== void 0 ? { floorAreaM2: input.floorAreaM2 } : {},
        status: "active",
        ...input.notes ? { notes: input.notes } : {},
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      await repos.tx.run(async (tx) => {
        await repos.houses.insert(rec, tx).catch(duplicate(`House name "${input.name}"`));
        await d.audit.record(ctx, { action: "house.created", entity: "house", entityId: rec.id, after: { name: rec.name, type: rec.type } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "house", entityId: rec.id, op: "upsert", version: 0, document: toHouseView(rec) }, tx);
      });
      return toHouseView(rec);
    },
    async replace(ctx, id, input) {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const cur = await repos.houses.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("House");
        if (cur.version !== input.version) throw new AppError("VERSION_CONFLICT", "This house was changed by someone else", { serverVersion: cur.version });
        if (input.capacityBirds !== void 0) {
          const occupied = (await repos.flocks.find(ctx.farmId, { where: { houseId: id, status: "active" } }, tx)).reduce((t, f) => t + (f.population?.alive ?? 0), 0);
          if (occupied > input.capacityBirds) throw new AppError("CAPACITY_EXCEEDED", `${occupied} birds are already in this house, more than a capacity of ${input.capacityBirds}`);
        }
        const { version, ...fields } = input;
        const next = await repos.houses.update(ctx.farmId, id, { name: fields.name, type: fields.type, capacityBirds: fields.capacityBirds, floorAreaM2: fields.floorAreaM2, status: fields.status, notes: fields.notes, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version }, tx).catch(duplicate(`House name "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This house was changed by someone else");
        await d.audit.record(ctx, { action: "house.updated", entity: "house", entityId: id, before: cur, after: next }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "house", entityId: id, op: "upsert", version: next.version, document: toHouseView(next) }, tx);
        return toHouseView(next);
      });
    },
    /** A house can be deleted only when no planned or active flock uses it. */
    async remove(ctx, id) {
      assertCan(ctx, "flock.manage");
      await repos.tx.run(async (tx) => {
        const cur = await repos.houses.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("House");
        const inUse = await repos.flocks.find(ctx.farmId, { where: { houseId: id, status: ["planned", "active"] }, limit: 1 }, tx);
        if (inUse.length) throw new AppError("INVALID_STATE_TRANSITION", "Move or close the flocks in this house before deleting it");
        const now = clock.now();
        await repos.houses.update(ctx.farmId, id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, void 0, tx);
        await d.audit.record(ctx, { action: "house.deleted", entity: "house", entityId: id, before: { name: cur.name } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "house", entityId: id, op: "delete", version: cur.version + 1 }, tx);
      });
    }
  };
}

// src/services/flock.service.ts
var REVERSIBLE = /* @__PURE__ */ new Set(["placement", "mortality", "cull", "adjustment", "sale", "weighing"]);
var sortEvents = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1);
function toLedger(e) {
  return {
    id: e.id,
    type: e.type,
    date: e.date,
    ...e.birds !== void 0 ? { birds: e.birds } : {},
    ...e.deadOnArrival !== void 0 ? { deadOnArrival: e.deadOnArrival } : {},
    ...e.delta !== void 0 ? { delta: e.delta } : {},
    ...e.totalLiveWeightKg !== void 0 ? { totalLiveWeightKg: e.totalLiveWeightKg } : {},
    ...e.averageWeightG !== void 0 ? { averageWeightG: e.averageWeightG } : {},
    ...e.sampleSize !== void 0 ? { sampleSize: e.sampleSize } : {},
    ...e.total ? { totalMinor: e.total.amountMinor } : {},
    ...e.cost ? { costMinor: e.cost.amountMinor } : {},
    ...e.toStatus ? { toStatus: e.toStatus } : {},
    ...e.reversalOf ? { reversalOf: e.reversalOf } : {}
  };
}
function createFlockService(d) {
  const { repos, clock } = d;
  const hooks = { beforeBirdsLeave: [], extraCostMinor: [], extraIncomeMinor: [], afterSale: [], onSaleReversed: [] };
  const birdsLeave = async (ctx, flock, date, purpose, tx) => {
    for (const h of hooks.beforeBirdsLeave) await h(ctx, flock, date, purpose, tx);
  };
  async function farmOf(ctx, tx) {
    const farm = await repos.farms.findById(ctx.farmId, tx);
    if (!farm) throw notFound("Farm");
    return farm;
  }
  const todayOf = (farm) => localDateOf(clock.now(), farm.settings.timezone);
  async function loadFlock(ctx, flockId, tx) {
    const f = await repos.flocks.findById(ctx.farmId, flockId, tx);
    if (!f) throw notFound("Flock");
    return f;
  }
  async function loadEvents(ctx, flockId, tx) {
    return (await repos.flockEvents.find(ctx.farmId, { where: { flockId } }, tx)).sort(sortEvents);
  }
  function assertStatus(flock, allowed, action) {
    if (!allowed.includes(flock.status)) {
      throw new DomainError("INVALID_STATE_TRANSITION", `Cannot ${action}: flock ${flock.flockCode} is ${flock.status}`, { status: flock.status });
    }
  }
  function assertDate(date, farm, flock) {
    if (date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${date} is in the future for this farm (today is ${todayOf(farm)})`);
    if (flock?.placementDate && date < flock.placementDate) {
      throw new AppError("VALIDATION_FAILED", `${date} is before the flock was placed on ${flock.placementDate}`);
    }
  }
  function assertCurrency(m, farm, field) {
    if (m && m.currency !== farm.settings.currency) {
      throw new AppError("VALIDATION_FAILED", `${field} must be in the farm currency (${farm.settings.currency})`);
    }
  }
  async function assertCapacity(ctx, houseId, incoming, excludeFlockId, tx) {
    const house = await repos.houses.findById(ctx.farmId, houseId, tx);
    if (!house) throw notFound("House");
    if (house.status !== "active") throw new AppError("VALIDATION_FAILED", `House ${house.name} is inactive`);
    if (house.capacityBirds === void 0) return house;
    const flocks = await repos.flocks.find(ctx.farmId, { where: { houseId, status: "active" } }, tx);
    const occupied = flocks.filter((f) => f.id !== excludeFlockId).reduce((t, f) => t + (f.population?.alive ?? 0), 0);
    if (occupied + incoming > house.capacityBirds) {
      throw new AppError("CAPACITY_EXCEEDED", `${house.name} holds ${house.capacityBirds} birds; it has ${occupied} and this would add ${incoming}`, {
        capacity: house.capacityBirds,
        occupied,
        incoming
      });
    }
    return house;
  }
  function snapshot(events, asOf) {
    const p6 = population(events.map(toLedger));
    return { placed: p6.placed, transferredIn: p6.transferredIn, mortality: p6.mortality, culled: p6.culled, sold: p6.sold, transferredOut: p6.transferredOut, adjustments: p6.adjustments, alive: p6.alive, asOf };
  }
  async function appendEvents(ctx, flock, existing, drafts, flockPatch, farm, tx, action) {
    const now = clock.now();
    const records = drafts.map((e) => ({ id: newId(), farmId: ctx.farmId, flockId: flock.id, createdBy: ctx.userId, createdAt: now, updatedAt: now, ...e }));
    let ledger = existing.map(toLedger);
    for (const r of records) {
      assertEventAllowed(ledger, toLedger(r));
      ledger = [...ledger, toLedger(r)];
    }
    const all = [...existing, ...records].sort(sortEvents);
    await repos.flockEvents.insertMany(records, tx);
    const next = await repos.flocks.update(
      ctx.farmId,
      flock.id,
      { ...flockPatch, population: snapshot(all, todayOf(farm)), updatedBy: ctx.userId, updatedAt: now },
      { expectedVersion: flock.version },
      tx
    );
    if (!next) throw new AppError("VERSION_CONFLICT", "This flock was changed at the same time by someone else. Reload and try again.");
    for (const r of records) {
      await d.audit.record(ctx, { action: `flock.${r.reversalOf ? "event_reversed" : r.type}`, entity: "flock_event", entityId: r.id, after: { flockId: flock.id, type: r.type, date: r.date, birds: r.birds, delta: r.delta } }, tx);
      await d.sync.recordChange(ctx.farmId, { entity: "flock_event", entityId: r.id, op: "upsert", version: 0, document: toEventView(r, /* @__PURE__ */ new Set()) }, tx);
    }
    await d.audit.record(ctx, { action, entity: "flock", entityId: flock.id, before: { status: flock.status, alive: flock.population?.alive ?? 0, houseId: flock.houseId }, after: { status: next.status, alive: next.population?.alive ?? 0, houseId: next.houseId } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flock.id, op: "upsert", version: next.version, document: toFlockView(next) }, tx);
    return { flock: next, events: records };
  }
  function onFlock(ctx, flockId, fn) {
    return repos.tx.run(async (tx) => {
      const farm = await farmOf(ctx, tx);
      const flock = await loadFlock(ctx, flockId, tx);
      const events = await loadEvents(ctx, flockId, tx);
      return fn({ farm, flock, events, tx });
    });
  }
  function estimateWeightKg(flock, events, birds, date) {
    const g = weightCurve(flock.startingWeightG, flock.placementDate, events.map(toLedger)).at(date);
    return g === null ? void 0 : Math.round(birds * g / 1e3 * 1e3) / 1e3;
  }
  const money = (amountMinor, currency) => ({ amountMinor: Math.round(amountMinor), currency });
  function toFlockView(f, metrics) {
    return {
      id: f.id,
      farmId: f.farmId,
      houseId: f.houseId,
      name: f.name,
      flockCode: f.flockCode,
      type: f.type,
      ...f.customTypeName ? { customTypeName: f.customTypeName } : {},
      species: f.species,
      ...f.breed ? { breed: f.breed } : {},
      ...f.strain ? { strain: f.strain } : {},
      ...f.source ? { source: f.source } : {},
      ...f.hatchDate ? { hatchDate: f.hatchDate } : {},
      ...f.placementDate ? { placementDate: f.placementDate } : {},
      ...f.placementCount !== void 0 ? { placementCount: f.placementCount } : {},
      ...f.startingWeightG !== void 0 ? { startingWeightG: f.startingWeightG } : {},
      ...f.chickCost ? { chickCost: f.chickCost } : {},
      ...f.targetSaleDate ? { targetSaleDate: f.targetSaleDate } : {},
      ...f.closedDate ? { closedDate: f.closedDate } : {},
      status: f.status,
      ...f.splitFromFlockId ? { splitFromFlockId: f.splitFromFlockId } : {},
      ...f.notes ? { notes: f.notes } : {},
      currentBirdCount: f.population?.alive ?? 0,
      version: f.version,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      ...metrics ? { metrics } : {}
    };
  }
  function toEventView(e, reversed) {
    const { farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, buyerId: _b, fromStatus: _fs, toStatus: _ts, birdWeightId: _bw, note: note2, reason, ...rest } = e;
    const why = reason ?? note2;
    return { ...rest, ...why ? { reason: why } : {}, reversed: reversed.has(e.id), createdAt: createdAt.toISOString() };
  }
  async function metricsFor(ctx, flock, events, farm, asOf, referencePricePerKgMinor) {
    const feed = await repos.feedConsumption.find(ctx.farmId, { where: { flockId: flock.id } });
    const date = asOf ?? (flock.status === "closed" && flock.closedDate ? flock.closedDate : todayOf(farm));
    const eggs = await repos.eggRecords.aggregate(ctx.farmId, { where: { flockId: flock.id }, range: { field: "date", to: date } }, ["flockId"], ["collected"]);
    let otherCostMinor = 0;
    for (const h of hooks.extraCostMinor) otherCostMinor += await h(ctx, flock.id, date);
    let otherIncomeMinor = 0;
    for (const h of hooks.extraIncomeMinor) otherIncomeMinor += await h(ctx, flock.id, date);
    const m = computeFlockMetrics({
      flockType: flock.type,
      ...flock.placementDate ? { placementDate: flock.placementDate } : {},
      ...flock.hatchDate ? { hatchDate: flock.hatchDate } : {},
      ...flock.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {},
      ...flock.startingWeightG !== void 0 ? { startingWeightG: flock.startingWeightG } : {},
      events: events.map(toLedger),
      feed: feed.map((f) => ({ date: f.date, quantityKg: f.quantityKg, kind: f.kind ?? "consumption", ...f.cost ? { costMinor: f.cost.amountMinor } : {} })),
      eggsCollected: eggs[0]?.sums["collected"] ?? 0,
      otherCostMinor,
      otherIncomeMinor,
      asOf: date,
      includeMortalityWeight: farm.settings.fcrIncludesMortalityWeight,
      referencePricePerKgMinor: referencePricePerKgMinor ?? null
    });
    const { weightOutKg: _o, weightInKg: _i, ...rest } = m;
    return { ...rest, stage: stageFor(flock.type, m.ageDays)?.key ?? null, currency: farm.settings.currency, fcrIncludesMortalityWeight: farm.settings.fcrIncludesMortalityWeight };
  }
  async function drawChickLot(ctx, flock, p6, farm, tx) {
    if (!p6.chickLotId) return p6;
    const lot = await repos.chickLots.findById(ctx.farmId, p6.chickLotId, tx);
    if (!lot) throw notFound("Chick lot");
    if (lot.status !== "available") throw new DomainError("INVALID_STATE_TRANSITION", "That chick lot has no chicks left");
    if (lot.species !== flock.species) throw new AppError("VALIDATION_FAILED", `That lot holds ${lot.species}, not ${flock.species}`);
    if (p6.count > lot.remaining) throw new DomainError("INSUFFICIENT_STOCK", `Only ${lot.remaining} chicks left in that lot`, { available: lot.remaining, requested: p6.count });
    const remaining = lot.remaining - p6.count;
    const next = await repos.chickLots.update(
      ctx.farmId,
      lot.id,
      { remaining, status: remaining === 0 ? "depleted" : "available", placedFlockIds: [...lot.placedFlockIds ?? [], flock.id], updatedBy: ctx.userId, updatedAt: clock.now() },
      { expectedVersion: lot.version },
      tx
    );
    if (!next) throw new AppError("VERSION_CONFLICT", "That chick lot changed at the same time elsewhere. Try again.");
    return p6.chickCost || !lot.unitCost ? p6 : { ...p6, chickCost: money(lot.unitCost.amountMinor * p6.count, farm.settings.currency) };
  }
  function placementDraft(p6) {
    const net = p6.count - p6.deadOnArrival;
    return {
      type: "placement",
      date: p6.date,
      birds: p6.count,
      ...p6.deadOnArrival ? { deadOnArrival: p6.deadOnArrival } : {},
      ...p6.startingWeightG ? { totalLiveWeightKg: Math.round(net * p6.startingWeightG) / 1e3 } : {},
      ...p6.chickCost ? { cost: p6.chickCost } : {},
      ...p6.chickLotId ? { chickLotId: p6.chickLotId } : {}
    };
  }
  const placementFields = (p6) => ({
    status: "active",
    placementDate: p6.date,
    placementCount: p6.count,
    deadOnArrival: p6.deadOnArrival,
    ageDaysAtPlacement: p6.ageDaysAtPlacement,
    ...p6.startingWeightG !== void 0 ? { startingWeightG: p6.startingWeightG } : {},
    ...p6.chickCost ? { chickCost: p6.chickCost } : {}
  });
  return {
    toFlockView,
    // ---- CRUD ------------------------------------------------------------------
    async create(ctx, input) {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        if (input.placement) {
          assertDate(input.placement.date, farm);
          assertCurrency(input.placement.chickCost, farm, "chickCost");
          await assertCapacity(ctx, input.houseId, input.placement.count - input.placement.deadOnArrival, void 0, tx);
        } else if (!await repos.houses.findById(ctx.farmId, input.houseId, tx)) throw notFound("House");
        const now = clock.now();
        let flockCode = input.flockCode;
        if (!flockCode) {
          const prefix = { broiler: "B", layer: "L", breeder: "BR", chick: "C", custom: "F" }[input.type] ?? "F";
          const month = (input.placement?.date ?? now.toISOString().slice(0, 10)).slice(2, 7).replace("-", "");
          const taken = new Set((await repos.flocks.find(ctx.farmId, {}, tx)).map((f) => f.flockCode));
          let n = 1;
          while (taken.has(`${prefix}-${month}-${n}`)) n++;
          flockCode = `${prefix}-${month}-${n}`;
        }
        const flock = {
          id: input.id ?? newId(),
          farmId: ctx.farmId,
          houseId: input.houseId,
          name: input.name,
          flockCode,
          type: input.type,
          ...input.customTypeName ? { customTypeName: input.customTypeName } : {},
          species: input.species,
          ...input.breed ? { breed: input.breed } : {},
          ...input.strain ? { strain: input.strain } : {},
          ...input.source ? { source: input.source } : {},
          ...input.hatchDate ? { hatchDate: input.hatchDate } : {},
          ...input.targetSaleDate ? { targetSaleDate: input.targetSaleDate } : {},
          ...input.notes ? { notes: input.notes } : {},
          status: "planned",
          population: snapshot([], todayOf(farm)),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.flocks.insert(flock, tx).catch(duplicate(`Flock code "${flockCode}"`));
        await d.audit.record(ctx, { action: "flock.created", entity: "flock", entityId: flock.id, after: { name: flock.name, flockCode: flock.flockCode, type: flock.type } }, tx);
        if (!input.placement) {
          await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flock.id, op: "upsert", version: 0, document: toFlockView(flock) }, tx);
          return toFlockView(flock);
        }
        const placement = await drawChickLot(ctx, flock, input.placement, farm, tx);
        const out = await appendEvents(ctx, flock, [], [placementDraft(placement)], placementFields(placement), farm, tx, "flock.placed");
        return toFlockView(out.flock);
      });
    },
    async list(ctx, q8) {
      assertCan(ctx, "production.read");
      const where = {};
      if (q8.status) where["status"] = q8.status;
      if (q8.houseId) where["houseId"] = q8.houseId;
      if (q8.type) where["type"] = q8.type;
      const list = await repos.flocks.find(ctx.farmId, { where, sort: [{ field: "createdAt", dir: -1 }] });
      return list.map((f) => toFlockView(f));
    },
    async get(ctx, flockId, q8 = {}) {
      assertCan(ctx, "production.read");
      const farm = await farmOf(ctx);
      const flock = await loadFlock(ctx, flockId);
      const events = await loadEvents(ctx, flockId);
      return toFlockView(flock, await metricsFor(ctx, flock, events, farm, q8.asOf, q8.referencePricePerKgMinor));
    },
    async metrics(ctx, flockId, q8) {
      assertCan(ctx, "production.read");
      const farm = await farmOf(ctx);
      const flock = await loadFlock(ctx, flockId);
      return metricsFor(ctx, flock, await loadEvents(ctx, flockId), farm, q8.asOf, q8.referencePricePerKgMinor);
    },
    async replace(ctx, flockId, input) {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const flock = await loadFlock(ctx, flockId, tx);
        if (flock.version !== input.version) throw new AppError("VERSION_CONFLICT", "This flock was changed by someone else", { serverVersion: flock.version });
        if (flock.type === "custom" && !input.customTypeName) throw new AppError("VALIDATION_FAILED", "Name the custom poultry type");
        const next = await repos.flocks.update(
          ctx.farmId,
          flockId,
          {
            name: input.name,
            flockCode: input.flockCode,
            customTypeName: flock.type === "custom" ? input.customTypeName : void 0,
            breed: input.breed,
            strain: input.strain,
            source: input.source,
            hatchDate: input.hatchDate,
            targetSaleDate: input.targetSaleDate,
            notes: input.notes,
            updatedBy: ctx.userId,
            updatedAt: clock.now()
          },
          { expectedVersion: input.version },
          tx
        ).catch(duplicate(`Flock code "${input.flockCode}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This flock was changed by someone else");
        await d.audit.record(ctx, { action: "flock.updated", entity: "flock", entityId: flockId, before: flock, after: next }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flockId, op: "upsert", version: next.version, document: toFlockView(next) }, tx);
        return toFlockView(next);
      });
    },
    /** Only a planned flock (no events yet) can be deleted. A flock with records is closed instead, never deleted. */
    async remove(ctx, flockId) {
      assertCan(ctx, "flock.manage");
      await repos.tx.run(async (tx) => {
        const flock = await loadFlock(ctx, flockId, tx);
        const events = await loadEvents(ctx, flockId, tx);
        if (flock.status !== "planned" || events.length) {
          throw new DomainError("INVALID_STATE_TRANSITION", "A flock with records cannot be deleted. Close it instead, or reverse wrong entries.");
        }
        const now = clock.now();
        await repos.flocks.update(ctx.farmId, flockId, { status: "cancelled", deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, { expectedVersion: flock.version }, tx);
        await d.audit.record(ctx, { action: "flock.deleted", entity: "flock", entityId: flockId, before: { flockCode: flock.flockCode } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "flock", entityId: flockId, op: "delete", version: flock.version + 1 }, tx);
      });
    },
    // ---- lifecycle commands ------------------------------------------------------
    async place(ctx, flockId, p6) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["planned"], "place birds");
        assertTransition(flock.status, "active");
        assertDate(p6.date, farm);
        assertCurrency(p6.chickCost, farm, "chickCost");
        await assertCapacity(ctx, flock.houseId, p6.count - p6.deadOnArrival, flock.id, tx);
        const placement = await drawChickLot(ctx, flock, p6, farm, tx);
        return toFlockView((await appendEvents(ctx, flock, events, [placementDraft(placement)], placementFields(placement), farm, tx, "flock.placed")).flock);
      });
    },
    async recordMortality(ctx, flockId, r) {
      assertCan(ctx, "production.record");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "record deaths");
        assertDate(r.date, farm, flock);
        const out = await appendEvents(ctx, flock, events, [{ type: "mortality", date: r.date, birds: r.count, cause: r.cause, ...r.notes ? { note: r.notes } : {} }], {}, farm, tx, "flock.mortality_recorded");
        return toEventView(out.events[0], /* @__PURE__ */ new Set());
      });
    },
    async recordCull(ctx, flockId, r) {
      assertCan(ctx, "production.record");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "record culls");
        assertDate(r.date, farm, flock);
        const out = await appendEvents(ctx, flock, events, [{ type: "cull", date: r.date, birds: r.count, ...r.reason ? { reason: r.reason } : {}, ...r.notes ? { note: r.notes } : {} }], {}, farm, tx, "flock.cull_recorded");
        return toEventView(out.events[0], /* @__PURE__ */ new Set());
      });
    },
    async transfer(ctx, flockId, r) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "transfer birds");
        assertDate(r.date, farm, flock);
        if (r.mode === "house") {
          if (r.toHouseId === flock.houseId) throw new AppError("VALIDATION_FAILED", "The flock is already in that house");
          await assertCapacity(ctx, r.toHouseId, flock.population?.alive ?? 0, flock.id, tx);
          const out = await appendEvents(
            ctx,
            flock,
            events,
            [{ type: "transfer_house", date: r.date, fromHouseId: flock.houseId, toHouseId: r.toHouseId, ...r.notes ? { note: r.notes } : {} }],
            { houseId: r.toHouseId },
            farm,
            tx,
            "flock.moved_house"
          );
          return { flock: toFlockView(out.flock) };
        }
        if (r.toFlockId === flock.id) throw new AppError("VALIDATION_FAILED", "Cannot transfer birds to the same flock");
        await birdsLeave(ctx, flock, r.date, "move", tx);
        const dest = await loadFlock(ctx, r.toFlockId, tx);
        assertStatus(dest, ["active"], "receive birds");
        if (dest.species !== flock.species) throw new AppError("VALIDATION_FAILED", `Cannot move ${flock.species} into a ${dest.species} flock`);
        assertDate(r.date, farm, dest);
        const available = birdsAvailable(events.map(toLedger), r.date);
        if (r.birds > available) throw new DomainError("INSUFFICIENT_BIRDS", `Only ${available} birds can leave ${flock.flockCode} on ${r.date}`, { available, requested: r.birds });
        if (dest.houseId !== flock.houseId) await assertCapacity(ctx, dest.houseId, r.birds, dest.id, tx);
        const groupId = newId();
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, r.birds, r.date);
        const cost = money(acquisitionCostPerBird(events.map(toLedger)) * r.birds, farm.settings.currency);
        const common = { date: r.date, birds: r.birds, groupId, cost, ...weight !== void 0 ? { totalLiveWeightKg: weight } : {}, ...r.notes ? { note: r.notes } : {} };
        const src = await appendEvents(ctx, flock, events, [{ ...common, type: "transfer_out", counterpartFlockId: dest.id, toHouseId: dest.houseId }], {}, farm, tx, "flock.transferred_out");
        const dst = await appendEvents(ctx, dest, await loadEvents(ctx, dest.id, tx), [{ ...common, type: "transfer_in", counterpartFlockId: flock.id, fromHouseId: flock.houseId }], {}, farm, tx, "flock.transferred_in");
        return { flock: toFlockView(src.flock), destination: toFlockView(dst.flock) };
      });
    },
    async split(ctx, flockId, r) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "split the flock");
        assertDate(r.date, farm, flock);
        await birdsLeave(ctx, flock, r.date, "move", tx);
        const ledger = events.map(toLedger);
        const available = birdsAvailable(ledger, r.date);
        if (r.birds > available) throw new DomainError("INSUFFICIENT_BIRDS", `Only ${available} birds can leave ${flock.flockCode} on ${r.date}`, { available, requested: r.birds });
        if (r.birds === population(ledger, r.date).alive) throw new AppError("VALIDATION_FAILED", "Splitting every bird is a house transfer; use a transfer with mode house");
        await assertCapacity(ctx, r.newFlock.houseId, r.birds, r.newFlock.houseId === flock.houseId ? flock.id : void 0, tx);
        const now = clock.now();
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, r.birds, r.date);
        const avgG = weight !== void 0 ? Math.round(weight * 1e3 / r.birds) : void 0;
        const age = flock.hatchDate ? void 0 : flock.placementDate ? daysBetween(flock.placementDate, r.date) + (flock.ageDaysAtPlacement ?? 0) : void 0;
        const child = {
          id: r.newFlock.id ?? newId(),
          farmId: ctx.farmId,
          houseId: r.newFlock.houseId,
          name: r.newFlock.name,
          flockCode: r.newFlock.flockCode,
          type: flock.type,
          ...flock.customTypeName ? { customTypeName: flock.customTypeName } : {},
          species: flock.species,
          ...flock.breed ? { breed: flock.breed } : {},
          ...flock.strain ? { strain: flock.strain } : {},
          ...flock.source ? { source: flock.source } : {},
          ...flock.hatchDate ? { hatchDate: flock.hatchDate } : {},
          ...flock.targetSaleDate ? { targetSaleDate: flock.targetSaleDate } : {},
          placementDate: r.date,
          ...age !== void 0 ? { ageDaysAtPlacement: age } : {},
          ...avgG !== void 0 ? { startingWeightG: avgG } : {},
          status: "active",
          splitFromFlockId: flock.id,
          population: snapshot([], todayOf(farm)),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.flocks.insert(child, tx).catch(duplicate(`Flock code "${r.newFlock.flockCode}"`));
        await d.audit.record(ctx, { action: "flock.created", entity: "flock", entityId: child.id, after: { flockCode: child.flockCode, splitFrom: flock.id } }, tx);
        const groupId = newId();
        const cost = money(acquisitionCostPerBird(ledger) * r.birds, farm.settings.currency);
        const common = { date: r.date, birds: r.birds, groupId, cost, ...weight !== void 0 ? { totalLiveWeightKg: weight } : {}, ...r.notes ? { note: r.notes } : {} };
        const src = await appendEvents(ctx, flock, events, [{ ...common, type: "split_out", counterpartFlockId: child.id, toHouseId: child.houseId }], {}, farm, tx, "flock.split");
        const dst = await appendEvents(ctx, child, [], [{ ...common, type: "split_in", counterpartFlockId: flock.id, fromHouseId: flock.houseId }], {}, farm, tx, "flock.created_by_split");
        return { flock: toFlockView(src.flock), newFlock: toFlockView(dst.flock) };
      });
    },
    async merge(ctx, flockId, r) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "merge the flock");
        assertDate(r.date, farm, flock);
        await birdsLeave(ctx, flock, r.date, "move", tx);
        if (r.intoFlockId === flock.id) throw new AppError("VALIDATION_FAILED", "A flock cannot merge into itself");
        const target = await loadFlock(ctx, r.intoFlockId, tx);
        assertStatus(target, ["active"], "receive a merge");
        assertDate(r.date, farm, target);
        if (target.type !== flock.type || target.species !== flock.species) {
          throw new AppError("VALIDATION_FAILED", `Only flocks of the same type and species can merge (${flock.type} ${flock.species} into ${target.type} ${target.species})`);
        }
        const ledger = events.map(toLedger);
        const later = effectiveEvents(ledger).find((e) => e.date > r.date);
        if (later) throw new DomainError("INVALID_STATE_TRANSITION", `${flock.flockCode} has entries after ${r.date}; merge on or after ${later.date}`);
        const birds = population(ledger, r.date).alive;
        if (birds <= 0) throw new DomainError("INSUFFICIENT_BIRDS", "There are no birds left to merge; close the flock instead");
        if (target.houseId !== flock.houseId) await assertCapacity(ctx, target.houseId, birds, target.id, tx);
        const groupId = newId();
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, birds, r.date);
        const cost = money(acquisitionCostPerBird(ledger) * birds, farm.settings.currency);
        const common = { date: r.date, birds, groupId, cost, ...weight !== void 0 ? { totalLiveWeightKg: weight } : {}, ...r.notes ? { note: r.notes } : {} };
        const src = await appendEvents(
          ctx,
          flock,
          events,
          [
            { ...common, type: "merge_out", counterpartFlockId: target.id, toHouseId: target.houseId },
            { type: "status_change", date: r.date, fromStatus: "active", toStatus: "closed", reason: `Merged into ${target.flockCode}`, groupId }
          ],
          { status: "closed", closedDate: r.date, mergedIntoFlockId: target.id },
          farm,
          tx,
          "flock.merged"
        );
        const dst = await appendEvents(ctx, target, await loadEvents(ctx, target.id, tx), [{ ...common, type: "merge_in", counterpartFlockId: flock.id, fromHouseId: flock.houseId }], {}, farm, tx, "flock.received_merge");
        return { flock: toFlockView(src.flock), target: toFlockView(dst.flock) };
      });
    },
    /** `opts.orderId` links the sale to an order that carries the income, so no separate receivable is made. */
    async sell(ctx, flockId, r, opts = {}) {
      assertCan(ctx, "flock.sell");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "sell birds");
        assertDate(r.date, farm, flock);
        await birdsLeave(ctx, flock, r.date, "sale", tx);
        for (const [m, f] of [[r.pricePerKg, "pricePerKg"], [r.pricePerBird, "pricePerBird"], [r.total, "total"]]) assertCurrency(m, farm, f);
        const available = birdsAvailable(events.map(toLedger), r.date);
        if (r.birds > available) {
          throw new DomainError("INSUFFICIENT_BIRDS", `Only ${available} birds are available to sell on ${r.date}; you asked to sell ${r.birds}`, { available, requested: r.birds });
        }
        const weight = r.totalLiveWeightKg ?? estimateWeightKg(flock, events, r.birds, r.date);
        const totalMinor = r.total ? r.total.amountMinor : r.pricePerKg ? r.pricePerKg.amountMinor * r.totalLiveWeightKg : r.pricePerBird.amountMinor * r.birds;
        const out = await appendEvents(
          ctx,
          flock,
          events,
          [{ type: "sale", date: r.date, birds: r.birds, total: money(totalMinor, farm.settings.currency), ...weight !== void 0 ? { totalLiveWeightKg: weight } : {}, ...opts.orderId ? { orderId: opts.orderId } : {}, ...r.notes ? { note: r.notes } : {} }],
          {},
          farm,
          tx,
          "flock.sold"
        );
        for (const h of hooks.afterSale) await h(ctx, out.flock, out.events[0], tx);
        return toEventView(out.events[0], /* @__PURE__ */ new Set());
      });
    },
    async adjust(ctx, flockId, r) {
      assertCan(ctx, "production.edit_any");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "adjust the count");
        assertDate(r.date, farm, flock);
        const out = await appendEvents(ctx, flock, events, [{ type: "adjustment", date: r.date, delta: r.delta, reason: r.reason }], {}, farm, tx, "flock.adjusted");
        return toEventView(out.events[0], /* @__PURE__ */ new Set());
      });
    },
    async weigh(ctx, flockId, r) {
      assertCan(ctx, "production.record");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "record a weighing");
        assertDate(r.date, farm, flock);
        const now = clock.now();
        let averageWeightG = r.averageWeightG;
        let sampleSize = r.sampleSize;
        let birdWeightId;
        if (r.weightsG) {
          const stats = weighSessionStats(r.weightsG);
          averageWeightG = Math.round(stats.meanG * 10) / 10;
          sampleSize = stats.count;
          birdWeightId = newId();
          await repos.birdWeights.insert(
            { id: birdWeightId, farmId: ctx.farmId, flockId, date: r.date, weightsG: r.weightsG, stats, ...r.notes ? { note: r.notes } : {}, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 },
            tx
          );
        }
        const out = await appendEvents(
          ctx,
          flock,
          events,
          [{ type: "weighing", date: r.date, averageWeightG, ...sampleSize ? { sampleSize } : {}, ...birdWeightId ? { birdWeightId } : {}, ...r.notes ? { note: r.notes } : {} }],
          {},
          farm,
          tx,
          "flock.weighed"
        );
        return toEventView(out.events[0], /* @__PURE__ */ new Set());
      });
    },
    /** Weigh-ins, newest first: average and sample size, plus min, max, CV and uniformity when birds were weighed one by one. */
    async weighings(ctx, flockId) {
      assertCan(ctx, "production.read");
      const flock = await loadFlock(ctx, flockId);
      const events = await loadEvents(ctx, flock.id);
      const live = new Set(effectiveEvents(events.map(toLedger)).map((e) => e.id));
      const sessions = await repos.birdWeights.find(ctx.farmId, { where: { flockId: flock.id } });
      const byId = new Map(sessions.map((s2) => [s2.id, s2]));
      return events.filter((e) => e.type === "weighing" && live.has(e.id)).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.getTime() - a.createdAt.getTime()).map((e) => {
        const s2 = e.birdWeightId ? byId.get(e.birdWeightId) : void 0;
        return {
          eventId: e.id,
          date: e.date,
          averageWeightG: e.averageWeightG ?? null,
          sampleSize: e.sampleSize ?? null,
          ...s2?.stats ? { stats: { minG: s2.stats.minG, maxG: s2.stats.maxG, sdG: Math.round(s2.stats.sdG * 10) / 10, cvPercent: Math.round(s2.stats.cvPercent * 10) / 10, uniformityPercent: Math.round(s2.stats.uniformityPercent * 10) / 10 } } : {},
          note: e.note ?? null
        };
      });
    },
    async close(ctx, flockId, r) {
      assertCan(ctx, "flock.manage");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertTransition(flock.status, "closed");
        assertDate(r.date, farm, flock);
        assertCanClose(events.map(toLedger), r.date);
        const out = await appendEvents(
          ctx,
          flock,
          events,
          [{ type: "status_change", date: r.date, fromStatus: flock.status, toStatus: "closed", ...r.notes ? { reason: r.notes } : {} }],
          { status: "closed", closedDate: r.date },
          farm,
          tx,
          "flock.closed"
        );
        return toFlockView(out.flock, await metricsFor(ctx, out.flock, [...events, ...out.events], farm));
      });
    },
    /** Undo one wrong entry by posting its reversal. The ledger must stay valid afterwards. */
    async reverse(ctx, flockId, eventId, reason) {
      assertCan(ctx, "production.edit_any");
      return onFlock(ctx, flockId, async ({ farm, flock, events, tx }) => {
        assertStatus(flock, ["active"], "reverse an entry");
        const target = events.find((e) => e.id === eventId);
        if (!target) throw notFound("Event");
        if (!REVERSIBLE.has(target.type)) {
          throw new DomainError("INVALID_STATE_TRANSITION", `A ${target.type.replace("_", " ")} cannot be reversed here; record the opposite movement instead`);
        }
        if (target.dailyRecordId) throw new DomainError("INVALID_STATE_TRANSITION", "This entry belongs to a daily record; edit the daily record instead");
        if (target.type === "sale" && target.orderId) throw new DomainError("INVALID_STATE_TRANSITION", "This sale belongs to an order; cancel or refund the order instead");
        if (target.type === "sale") for (const h of hooks.onSaleReversed) await h(ctx, target.id, tx);
        const out = await appendEvents(
          ctx,
          flock,
          events,
          [{ type: target.type, date: target.date, reversalOf: target.id, reason, ...target.birds !== void 0 ? { birds: target.birds } : {} }],
          {},
          farm,
          tx,
          "flock.event_reversed"
        );
        return toEventView(out.events[0], /* @__PURE__ */ new Set());
      });
    },
    async listEvents(ctx, flockId) {
      assertCan(ctx, "production.read");
      await loadFlock(ctx, flockId);
      const events = await loadEvents(ctx, flockId);
      const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf));
      return events.map((e) => toEventView(e, reversed));
    },
    /**
     * Ledger primitives for other services that write flock events inside their own transaction
     * (daily records). Same validation, snapshot update and optimistic lock as every flock command.
     */
    ledger: { farmOf, todayOf, loadFlock, loadEvents, appendEvents, assertStatus, assertDate, assertCurrency, money },
    hooks
  };
}

// src/services/report.service.ts
var REPORTS = {
  farm: { title: "Farm report", permission: "farm.read", needsFlock: false, description: "Flocks, production in the period, alerts, and money totals for those who may see money" },
  flock: { title: "Flock report", permission: "production.read", needsFlock: true, description: "One flock: performance, every day of the period, its events, and its costs for those who may see money" },
  egg: { title: "Egg report", permission: "production.read", needsFlock: false, description: "Eggs collected by day and flock, grades, breakage, hen-day production, egg stock" },
  feed: { title: "Feed report", permission: "production.read", needsFlock: false, description: "Feed eaten and wasted by flock, feed per bird and FCR; purchases and stock for those who may see stock" },
  health: { title: "Health report", permission: "health.read", needsFlock: false, description: "Health records, treatments and withdrawal periods, vaccinations, deaths by cause" },
  hatchery: { title: "Hatchery report", permission: "hatchery.read", needsFlock: false, description: "Batches set in the period with every count, fertility, hatchability, saleable and loss %" },
  biosecurity: { title: "Biosecurity report", permission: "biosecurity.read", needsFlock: false, description: "Visitors, biosecurity logs, failed checks and corrective actions" },
  financial: { title: "Financial report", permission: "money.read", needsFlock: false, description: "Profit and loss, cash flow by account, receivables and payables, spending by supplier" },
  marketplace: { title: "Marketplace report", permission: "market.read", needsFlock: false, description: "Listings, orders and their status, sales and payments received" }
};
var col = (key, label, type = "text", decimals) => ({ key, label, type, ...decimals !== void 0 ? { decimals } : {} });
var table = (title, columns, rows, extra = {}) => ({ kind: "table", title, columns, rows, ...extra });
var sum = (rows, f) => rows.reduce((t, r) => t + (f(r) ?? 0), 0);
var r1 = (n, dp = 1) => n === null || n === void 0 || !Number.isFinite(n) ? null : Math.round(n * 10 ** dp) / 10 ** dp;
function createReportService(d) {
  const { repos, clock } = d;
  function period(farm, q8) {
    const today = localDateOf(clock.now(), farm.settings.timezone);
    const to = q8.to ?? today;
    const from = q8.from ?? addDays(to, -29);
    if (from > to) throw new AppError("VALIDATION_FAILED", "from must be on or before to");
    if (dateRange(from, to).length > 366) throw new AppError("VALIDATION_FAILED", "A report covers at most 366 days");
    return { from, to };
  }
  const inRange = (date, p6) => !!date && date >= p6.from && date <= p6.to;
  async function liveEvents(ctx, flockIds) {
    const all = await repos.flockEvents.find(ctx.farmId, flockIds ? { where: { flockId: flockIds } } : {});
    return effectiveEvents(all.map(toLedger)).map((e) => ({ ...e, raw: all.find((x) => x.id === e.id) }));
  }
  const builders = {
    async farm(ctx, farm, p6, _q, notes) {
      const [houses, flocks, alerts] = await Promise.all([repos.houses.find(ctx.farmId), repos.flocks.find(ctx.farmId, { where: { status: ["planned", "active", "closed"] } }), repos.alerts.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to } })]);
      const active = flocks.filter((f) => f.status === "active");
      const sections = [
        { kind: "summary", title: "Farm", items: [
          { label: "Country", value: farm.countryCode ?? "\u2014", type: "text" },
          { label: "Houses", value: houses.length, type: "number" },
          { label: "Active flocks", value: active.length, type: "number" },
          { label: "Birds alive now", value: sum(active, (f) => f.population?.alive), type: "number" },
          { label: "Alerts raised in the period", value: alerts.length, type: "number" },
          { label: "Alerts still open", value: alerts.filter((a) => a.status !== "resolved").length, type: "number" }
        ] }
      ];
      if (can(ctx.role, "production.read")) {
        const houseName = new Map(houses.map((h) => [h.id, h.name]));
        const rows = [];
        for (const f of flocks.filter((x) => x.status !== "planned")) {
          const m = await d.flocks.metrics(ctx, f.id, {});
          rows.push({ code: f.flockCode, type: f.type, house: houseName.get(f.houseId) ?? "", status: f.status, placed: f.placementDate ?? null, birdsIn: m.birdsIn, alive: m.currentBirdCount, mortality: r1(m.mortalityRate), fcr: r1(m.fcr, 2), eggs: m.eggsCollected });
        }
        sections.push(table("Flocks (to date)", [col("code", "Flock"), col("type", "Type"), col("house", "House"), col("status", "Status"), col("placed", "Placed", "date"), col("birdsIn", "Birds in", "number"), col("alive", "Alive", "number"), col("mortality", "Mortality", "percent"), col("fcr", "FCR", "number", 2), col("eggs", "Eggs", "number")], rows));
        const ev = (await liveEvents(ctx)).filter((e) => inRange(e.date, p6));
        const [feed, water, eggs] = await Promise.all([
          repos.feedConsumption.find(ctx.farmId, { where: { kind: "consumption" }, range: { field: "date", from: p6.from, to: p6.to } }),
          repos.waterRecords.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to } }),
          repos.eggRecords.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to } })
        ]);
        const daily = dateRange(p6.from, p6.to).map((date) => ({
          date,
          deaths: sum(ev.filter((e) => e.type === "mortality" && e.date === date), (e) => e.birds),
          culls: sum(ev.filter((e) => e.type === "cull" && e.date === date), (e) => e.birds),
          eggs: sum(eggs.filter((e) => e.date === date), (e) => e.collected),
          feedKg: r1(sum(feed.filter((f) => f.date === date), (f) => f.quantityKg), 2),
          waterL: r1(sum(water.filter((w) => w.date === date), (w) => w.litres), 1)
        }));
        sections.push(table("Production by day", [col("date", "Date", "date"), col("deaths", "Deaths", "number"), col("culls", "Culls", "number"), col("eggs", "Eggs", "number"), col("feedKg", "Feed (kg)", "number", 2), col("waterL", "Water (L)", "number", 1)], daily, { totals: { deaths: sum(daily, (x) => x.deaths), culls: sum(daily, (x) => x.culls), eggs: sum(daily, (x) => x.eggs), feedKg: r1(sum(daily, (x) => x.feedKg), 2), waterL: r1(sum(daily, (x) => x.waterL), 1) } }));
      } else notes.push("Production figures are left out: your role does not include production records.");
      const byType = /* @__PURE__ */ new Map();
      for (const a of alerts) byType.set(a.ruleType, (byType.get(a.ruleType) ?? 0) + 1);
      sections.push(table("Alerts in the period", [col("type", "Alert"), col("count", "Count", "number")], [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))));
      if (can(ctx.role, "money.read")) {
        const pnl = await d.finance.profitAndLoss(ctx, p6);
        sections.push({ kind: "summary", title: "Money (excluding tax)", items: [
          { label: "Revenue", value: pnl.revenue.totalMinor, type: "money" },
          { label: "Expenses", value: pnl.expenses.totalMinor, type: "money" },
          { label: "Net profit", value: pnl.netProfitMinor, type: "money" },
          { label: "Margin", value: r1(pnl.marginPercent), type: "percent" }
        ] });
      } else notes.push("Money figures are left out: your role does not include finance.");
      return sections;
    },
    async flock(ctx, _farm, p6, q8, notes) {
      if (!q8.flockId) throw new AppError("VALIDATION_FAILED", "Choose a flock (flockId) for the flock report");
      const f = await d.flocks.ledger.loadFlock(ctx, q8.flockId);
      const m = await d.flocks.metrics(ctx, f.id, {});
      const house = await repos.houses.findById(ctx.farmId, f.houseId);
      const sections = [
        { kind: "summary", title: `Flock ${f.flockCode}`, items: [
          { label: "Name", value: f.name, type: "text" },
          { label: "Type", value: f.type, type: "text" },
          { label: "Breed", value: f.breed ?? "\u2014", type: "text" },
          { label: "House", value: house?.name ?? "\u2014", type: "text" },
          { label: "Status", value: f.status, type: "text" },
          { label: "Placed", value: f.placementDate ?? null, type: "date" },
          { label: "Age (days)", value: m.ageDays, type: "number" },
          { label: "Birds in", value: m.birdsIn, type: "number" },
          { label: "Birds alive", value: m.currentBirdCount, type: "number" },
          { label: "Mortality", value: r1(m.mortalityRate), type: "percent" },
          { label: "Average weight (g)", value: r1(m.averageWeightG, 0), type: "number" },
          { label: "Feed eaten (kg)", value: r1(m.feedConsumedKg, 1), type: "number", decimals: 1 },
          { label: "FCR", value: r1(m.fcr, 2), type: "number", decimals: 2 },
          { label: "Eggs collected", value: m.eggsCollected, type: "number" }
        ] }
      ];
      const events = await d.flocks.ledger.loadEvents(ctx, f.id);
      const ledger = events.map(toLedger);
      const live = effectiveEvents(ledger);
      const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf));
      const [feed, water, eggs] = await Promise.all([
        repos.feedConsumption.find(ctx.farmId, { where: { flockId: f.id, kind: "consumption" }, range: { field: "date", from: p6.from, to: p6.to } }),
        repos.waterRecords.find(ctx.farmId, { where: { flockId: f.id }, range: { field: "date", from: p6.from, to: p6.to } }),
        repos.eggRecords.find(ctx.farmId, { where: { flockId: f.id }, range: { field: "date", from: p6.from, to: p6.to } })
      ]);
      const start = f.placementDate && f.placementDate > p6.from ? f.placementDate : p6.from;
      const days = start <= p6.to ? dateRange(start, p6.to) : [];
      const rows = days.map((date) => {
        const w = live.filter((e) => e.type === "weighing" && e.date === date).pop();
        return {
          date,
          alive: population(ledger, addDays(date, -1)).alive,
          deaths: sum(live.filter((e) => e.type === "mortality" && e.date === date), (e) => e.birds),
          culls: sum(live.filter((e) => e.type === "cull" && e.date === date), (e) => e.birds),
          feedKg: r1(sum(feed.filter((x) => x.date === date), (x) => x.quantityKg), 2),
          waterL: r1(sum(water.filter((x) => x.date === date), (x) => x.litres), 1),
          eggs: eggs.find((x) => x.date === date)?.collected ?? null,
          weightG: w?.averageWeightG ?? null
        };
      });
      sections.push(table("Every day of the period", [col("date", "Date", "date"), col("alive", "Alive at start", "number"), col("deaths", "Deaths", "number"), col("culls", "Culls", "number"), col("feedKg", "Feed (kg)", "number", 2), col("waterL", "Water (L)", "number", 1), col("eggs", "Eggs", "number"), col("weightG", "Avg weight (g)", "number")], rows, { totals: { deaths: sum(rows, (x) => x.deaths), culls: sum(rows, (x) => x.culls), feedKg: r1(sum(rows, (x) => x.feedKg), 2), waterL: r1(sum(rows, (x) => x.waterL), 1), eggs: sum(rows, (x) => x.eggs) } }));
      sections.push(table("Bird movements and events", [col("date", "Date", "date"), col("type", "Event"), col("birds", "Birds", "number"), col("detail", "Detail"), col("status", "Status")], events.filter((e) => !e.reversalOf && inRange(e.date, p6)).map((e) => ({ date: e.date, type: e.type.replace(/_/g, " "), birds: e.birds ?? null, detail: e.cause ?? e.note ?? (e.averageWeightG ? `${e.averageWeightG} g` : ""), status: reversed.has(e.id) ? "reversed" : "" }))));
      if (can(ctx.role, "money.read")) {
        sections.push({ kind: "summary", title: "Costs and revenue (to date)", items: [
          ...Object.entries(m.cost).filter(([k]) => k !== "totalMinor").map(([k, v]) => ({ label: k.replace(/Minor$/, "").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value: v, type: "money" })),
          { label: "Total cost", value: m.cost.totalMinor, type: "money" },
          { label: "Revenue", value: m.revenueMinor, type: "money" },
          { label: "Profit", value: m.profitMinor, type: "money" },
          { label: "Cost per bird", value: m.costPerBirdMinor, type: "money" },
          { label: "Cost per kg produced", value: m.costPerKgProducedMinor, type: "money" }
        ] });
      } else notes.push("Costs and revenue are left out: your role does not include finance.");
      return sections;
    },
    async egg(ctx, _farm, p6) {
      const [flocks, recs, moves] = await Promise.all([
        repos.flocks.find(ctx.farmId),
        repos.eggRecords.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to }, sort: [{ field: "date", dir: 1 }] }),
        repos.eggInventory.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to } })
      ]);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      const ledgers = /* @__PURE__ */ new Map();
      for (const id of new Set(recs.map((r) => r.flockId))) ledgers.set(id, (await d.flocks.ledger.loadEvents(ctx, id)).map(toLedger));
      const grades = ["large", "medium", "small", "extra_large", "jumbo", "pee_wee", "ungraded"].filter((g) => recs.some((r) => r.byGrade?.[g]));
      const rows = recs.map((r) => {
        const alive = population(ledgers.get(r.flockId) ?? [], addDays(r.date, -1)).alive;
        return { date: r.date, flock: code.get(r.flockId) ?? "", collected: r.collected, broken: r.broken, ...Object.fromEntries(grades.map((g) => [g, r.byGrade?.[g] ?? null])), henDay: alive > 0 ? r1(r.collected / alive * 100) : null, withheld: r.withheldUntil ? `until ${r.withheldUntil}` : "" };
      });
      const collected = sum(recs, (r) => r.collected);
      const broken = sum(recs, (r) => r.broken);
      const stock = await d.inventory.eggStock(ctx);
      const byType = /* @__PURE__ */ new Map();
      for (const mv of moves) byType.set(mv.type, (byType.get(mv.type) ?? 0) + mv.quantityDelta);
      return [
        { kind: "summary", title: "Eggs in the period", items: [
          { label: "Collected", value: collected, type: "number" },
          { label: "Broken", value: broken, type: "number" },
          { label: "Breakage", value: collected > 0 ? r1(broken / collected * 100) : null, type: "percent" },
          { label: "Average hen-day production", value: rows.length ? r1(sum(rows, (x) => x.henDay) / rows.filter((x) => x.henDay !== null).length) : null, type: "percent" },
          { label: "In stock now", value: stock.total, type: "number" }
        ] },
        table("Eggs by day and flock", [col("date", "Date", "date"), col("flock", "Flock"), col("collected", "Collected", "number"), col("broken", "Broken", "number"), ...grades.map((g) => col(g, g.replace("_", " "), "number")), col("henDay", "Hen-day", "percent"), col("withheld", "Withheld")], rows, { totals: { collected, broken } }),
        table("Egg stock movements in the period", [col("type", "Movement"), col("eggs", "Eggs", "number")], [...byType.entries()].map(([type, eggs]) => ({ type, eggs }))),
        table("Egg stock now by grade", [col("grade", "Grade"), col("eggs", "Eggs", "number")], Object.entries(stock.byGrade).filter(([, n]) => n !== 0).map(([grade, eggs]) => ({ grade, eggs })))
      ];
    },
    async feed(ctx, _farm, p6, _q, notes) {
      const [flocks, use] = await Promise.all([repos.flocks.find(ctx.farmId, { where: { status: ["active", "closed"] } }), repos.feedConsumption.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to } })]);
      const rows = [];
      for (const f of flocks) {
        const mine = use.filter((u) => u.flockId === f.id);
        if (!mine.length && f.status !== "active") continue;
        const eaten = sum(mine.filter((u) => (u.kind ?? "consumption") === "consumption"), (u) => u.quantityKg);
        const wasted = sum(mine.filter((u) => u.kind === "wastage"), (u) => u.quantityKg);
        const m = await d.flocks.metrics(ctx, f.id, {});
        rows.push({ flock: f.flockCode, type: f.type, eatenKg: r1(eaten, 1), wastedKg: r1(wasted, 1), wastePct: eaten + wasted > 0 ? r1(wasted / (eaten + wasted) * 100) : null, perBirdG: m.currentBirdCount > 0 ? r1(eaten * 1e3 / m.currentBirdCount, 0) : null, fcr: r1(m.fcr, 2) });
      }
      const sections = [table("Feed by flock in the period", [col("flock", "Flock"), col("type", "Type"), col("eatenKg", "Eaten (kg)", "number", 1), col("wastedKg", "Wasted (kg)", "number", 1), col("wastePct", "Waste", "percent"), col("perBirdG", "Per bird alive (g)", "number"), col("fcr", "FCR to date", "number", 2)], rows, { totals: { eatenKg: r1(sum(rows, (r) => r["eatenKg"]), 1), wastedKg: r1(sum(rows, (r) => r["wastedKg"]), 1) } })];
      if (can(ctx.role, "inventory.read")) {
        const items = new Map((await repos.inventoryItems.find(ctx.farmId, { where: { category: "feed" } })).map((i) => [i.id, i]));
        const purchased = new Set((await repos.inventoryTransactions.find(ctx.farmId, { where: { type: "receipt", sourceType: "purchase" }, range: { field: "date", from: p6.from, to: p6.to } })).map((t) => t.lotId));
        const lots = (await repos.inventoryLots.find(ctx.farmId, { range: { field: "receivedDate", from: p6.from, to: p6.to } })).filter((l) => items.has(l.itemId) && purchased.has(l.id));
        const showMoney = can(ctx.role, "money.read");
        sections.push(table("Feed purchased", [col("date", "Received", "date"), col("item", "Feed"), col("qty", "Quantity (kg)", "number", 1), col("supplier", "Supplier"), col("batch", "Batch"), ...showMoney ? [col("unitCost", "Price per kg", "money"), col("total", "Total", "money")] : []], lots.map((l) => ({ date: l.receivedDate, item: items.get(l.itemId)?.name ?? "", qty: l.quantityReceived, supplier: l.supplier ?? "", batch: l.batchNumber ?? "", ...showMoney ? { unitCost: l.unitCost.amountMinor, total: Math.round(l.unitCost.amountMinor * l.quantityReceived) } : {} }))));
        const stock = await d.feed.stock(ctx);
        sections.push(table("Feed in stock now", [col("item", "Feed"), col("kg", "In date (kg)", "number", 1), col("expiredKg", "Expired (kg)", "number", 1), col("dailyKg", "Daily use (kg)", "number", 1), col("days", "Days left", "number"), col("status", "Status")], stock.items.map((s2) => ({ item: s2.name, kg: s2.quantityKg, expiredKg: s2.expiredKg, dailyKg: s2.averageDailyUseKg, days: s2.daysRemaining, status: s2.status }))));
        if (!showMoney) notes.push("Feed prices are left out: your role does not include finance.");
      } else notes.push("Purchases and stock are left out: your role does not include stock.");
      return sections;
    },
    async health(ctx, _farm, p6) {
      const [flocks, recs, vacc] = await Promise.all([repos.flocks.find(ctx.farmId), repos.healthRecords.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to }, sort: [{ field: "date", dir: 1 }] }), repos.vaccinations.find(ctx.farmId, { range: { field: "dueDate", from: p6.from, to: p6.to }, sort: [{ field: "dueDate", dir: 1 }] })]);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      const treatments = recs.flatMap((r) => (r.treatments ?? []).map((t) => ({ flock: r.flockId ? code.get(r.flockId) ?? "" : "", medicine: t.medicineName, start: t.startDate, end: t.endDate, meatUntil: t.withdrawalMeatUntil ?? null, eggsUntil: t.withdrawalEggsUntil ?? null, source: t.withdrawalSource?.replace("_", " ") ?? "", prescribedBy: t.prescribedBy ?? "" })));
      const deaths = (await liveEvents(ctx)).filter((e) => e.type === "mortality" && inRange(e.date, p6));
      const byCause = /* @__PURE__ */ new Map();
      for (const e of deaths) byCause.set(e.raw.cause ?? "not recorded", (byCause.get(e.raw.cause ?? "not recorded") ?? 0) + (e.birds ?? 0));
      return [
        { kind: "summary", title: "Health in the period", items: [
          { label: "Health records", value: recs.length, type: "number" },
          { label: "Treatments", value: treatments.length, type: "number" },
          { label: "Vaccinations due", value: vacc.length, type: "number" },
          { label: "Vaccinations given", value: vacc.filter((v) => v.status === "done").length, type: "number" },
          { label: "Deaths", value: sum(deaths, (e) => e.birds), type: "number" }
        ] },
        table("Health records", [col("date", "Date", "date"), col("type", "Type"), col("flock", "Flock"), col("title", "Title"), col("assessment", "Assessment (by)"), col("affected", "Affected", "number"), col("dead", "Dead", "number"), col("followUp", "Follow-up", "date")], recs.map((r) => ({ date: r.date, type: r.type.replace("_", " "), flock: r.flockId ? code.get(r.flockId) ?? "" : "", title: r.title, assessment: r.assessment ? `${r.assessment.text} (${r.assessment.by})` : "", affected: r.affectedBirds ?? null, dead: r.deadBirds ?? null, followUp: r.followUpDate ?? null }))),
        table("Treatments and withdrawal periods", [col("flock", "Flock"), col("medicine", "Medicine"), col("start", "Start", "date"), col("end", "End", "date"), col("meatUntil", "Meat withdrawal until", "date"), col("eggsUntil", "Egg withdrawal until", "date"), col("source", "Period from"), col("prescribedBy", "Prescribed by")], treatments, { note: "Withdrawal periods are those recorded from the product label or the veterinarian." }),
        table("Vaccinations due in the period", [col("due", "Due", "date"), col("flock", "Flock"), col("vaccine", "Vaccine"), col("status", "Status"), col("given", "Given", "date"), col("birds", "Birds", "number"), col("batches", "Batches")], vacc.map((v) => ({ due: v.dueDate, flock: code.get(v.flockId) ?? "", vaccine: v.vaccineName, status: v.status, given: v.administeredDate ?? null, birds: v.birdsVaccinated ?? null, batches: (v.batches ?? []).map((b) => `${b.batchNumber}${b.expiryDate ? ` (exp ${b.expiryDate})` : ""}`).join("; ") }))),
        table("Deaths by cause", [col("cause", "Cause"), col("birds", "Birds", "number")], [...byCause.entries()].sort((a, b) => b[1] - a[1]).map(([cause, birds]) => ({ cause: cause.replace(/_/g, " "), birds })))
      ];
    },
    async hatchery(ctx, _farm, p6) {
      const batches = (await d.hatchery.listBatches(ctx, {})).filter((b) => inRange(b.setDate, p6));
      const summary = await d.hatchery.summary(ctx, p6);
      return [
        { kind: "summary", title: "Completed batches set in the period", items: [
          { label: "Batches hatched", value: summary.batches.hatched, type: "number" },
          { label: "Still incubating", value: summary.batches.incubating, type: "number" },
          { label: "Cancelled", value: summary.batches.cancelled, type: "number" },
          { label: "Eggs set (completed)", value: summary.completed.eggsSet, type: "number" },
          { label: "Fertility", value: r1(summary.completed.fertilityPercent), type: "percent" },
          { label: "Hatchability (of fertile)", value: r1(summary.completed.hatchabilityPercent), type: "percent" },
          { label: "Hatch of set", value: r1(summary.completed.hatchOfSetPercent), type: "percent" },
          { label: "Saleable chicks", value: r1(summary.completed.saleableChickPercent), type: "percent" },
          { label: "Loss", value: r1(summary.completed.lossPercent), type: "percent" }
        ] },
        table(
          "Batches",
          [col("code", "Batch"), col("set", "Set", "date"), col("status", "Status"), col("eggsSet", "Set", "number"), col("infertile", "Infertile", "number"), col("deadEmbryo", "Dead embryo", "number"), col("cracked", "Cracked", "number"), col("hatched", "Hatched", "number"), col("deadInShell", "Dead in shell", "number"), col("culled", "Culled", "number"), col("saleable", "Saleable", "number"), col("fertility", "Fertility", "percent"), col("hatchability", "Hatchability", "percent"), col("saleablePct", "Saleable", "percent"), col("loss", "Loss", "percent")],
          batches.map((b) => ({ code: b.code, set: b.setDate, status: b.status, eggsSet: b.eggsSet, infertile: b.counts.infertile, deadEmbryo: b.counts.deadEmbryo, cracked: b.counts.cracked, hatched: b.counts.hatched, deadInShell: b.counts.deadInShell, culled: b.counts.culled, saleable: b.counts.saleable, fertility: r1(b.metrics.fertilityPercent), hatchability: r1(b.metrics.hatchabilityPercent), saleablePct: r1(b.metrics.saleableChickPercent), loss: r1(b.metrics.lossPercent) })),
          { note: "Fertility = fertile \xF7 (set \u2212 cracked); hatchability = hatched \xF7 fertile; saleable and loss are of eggs set." }
        )
      ];
    },
    async biosecurity(ctx, farm, p6) {
      const tz = farm.settings.timezone;
      const [houses, visitors, logs, actions] = await Promise.all([repos.houses.find(ctx.farmId), repos.visitors.find(ctx.farmId), repos.biosecurityLogs.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to }, sort: [{ field: "date", dir: 1 }] }), repos.tasks.find(ctx.farmId, { where: { kind: "corrective_action" } })]);
      const houseName = new Map(houses.map((h) => [h.id, h.name]));
      const v = visitors.filter((x) => inRange(localDateOf(x.checkInAt, tz), p6)).sort((a, b) => a.checkInAt.getTime() - b.checkInAt.getTime());
      const acts = actions.filter((a) => inRange(localDateOf(a.createdAt, tz), p6));
      const byType = /* @__PURE__ */ new Map();
      for (const l of logs) byType.set(l.type, (byType.get(l.type) ?? 0) + 1);
      return [
        { kind: "summary", title: "Biosecurity in the period", items: [
          { label: "Visitors", value: v.length, type: "number" },
          { label: "Visitors flagged", value: v.filter((x) => x.flags?.length).length, type: "number" },
          { label: "Log entries", value: logs.length, type: "number" },
          { label: "Failed checklist items", value: sum(logs, (l) => l.checklist?.failedCount), type: "number" },
          { label: "Corrective actions raised", value: acts.length, type: "number" },
          { label: "Corrective actions still open", value: acts.filter((a) => a.status !== "done" && a.status !== "cancelled").length, type: "number" }
        ] },
        table("Visitors", [col("date", "Checked in", "date"), col("name", "Name"), col("company", "Company"), col("type", "Type"), col("contact", "Poultry contact"), col("downtime", "Downtime (h)", "number"), col("flags", "Flags")], v.map((x) => ({ date: localDateOf(x.checkInAt, tz), name: x.name, company: x.company ?? "", type: x.type, contact: x.previousPoultryContact?.hadContact ? "yes" : "no", downtime: x.downtimeHours ?? null, flags: (x.flags ?? []).join(", ").replace(/_/g, " ") }))),
        table("Log entries by type", [col("type", "Type"), col("count", "Entries", "number")], [...byType.entries()].map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))),
        table("Log entries", [col("date", "Date", "date"), col("type", "Type"), col("house", "House"), col("detail", "Detail"), col("failed", "Failed items", "number")], logs.map((l) => ({ date: l.date, type: l.type.replace(/_/g, " "), house: l.houseId ? houseName.get(l.houseId) ?? "" : "", detail: l.product?.name ?? l.vehicle?.registration ?? l.footbath?.action ?? l.pest?.pestType ?? l.wildBird?.description ?? "", failed: l.checklist?.failedCount ?? null }))),
        table("Corrective actions", [col("raised", "Raised", "date"), col("title", "Action"), col("priority", "Priority"), col("status", "Status"), col("completed", "Completed", "date"), col("verified", "Verified", "date")], acts.map((a) => ({ raised: localDateOf(a.createdAt, tz), title: a.title, priority: a.priority ?? "", status: a.status, completed: a.completedAt ? localDateOf(a.completedAt, tz) : null, verified: a.verifiedAt ? localDateOf(a.verifiedAt, tz) : null })))
      ];
    },
    async financial(ctx, _farm, p6) {
      const [pnl, cash, recv, pay, exp] = await Promise.all([d.finance.profitAndLoss(ctx, p6), d.finance.cashFlow(ctx, p6), d.finance.openItems(ctx, "income"), d.finance.openItems(ctx, "expense"), d.finance.expenseBreakdown(ctx, p6)]);
      const label = (k) => k.replace(/_/g, " ");
      const buckets = (b) => [{ label: "Current", value: b["current"] ?? 0 }, { label: "1\u201330 days overdue", value: b["1_30"] ?? 0 }, { label: "31\u201360 days", value: b["31_60"] ?? 0 }, { label: "61\u201390 days", value: b["61_90"] ?? 0 }, { label: "Over 90 days", value: b["over_90"] ?? 0 }];
      return [
        { kind: "summary", title: "Profit and loss (accrual, excluding tax)", items: [
          { label: "Revenue", value: pnl.revenue.totalMinor, type: "money" },
          { label: "Expenses", value: pnl.expenses.totalMinor, type: "money" },
          { label: "Net profit", value: pnl.netProfitMinor, type: "money" },
          { label: "Margin", value: r1(pnl.marginPercent), type: "percent" },
          { label: "Tax on sales", value: pnl.tax.onSalesMinor, type: "money" },
          { label: "Tax on purchases", value: pnl.tax.onPurchasesMinor, type: "money" }
        ] },
        table("Revenue by category", [col("category", "Category"), col("amount", "Amount", "money")], pnl.revenue.byCategory.map((x) => ({ category: label(x.key), amount: x.amountMinor })), { totals: { amount: pnl.revenue.totalMinor } }),
        table("Expenses by category", [col("category", "Category"), col("amount", "Amount", "money")], pnl.expenses.byCategory.map((x) => ({ category: label(x.key), amount: x.amountMinor })), { totals: { amount: pnl.expenses.totalMinor } }),
        table("Profit by month", [col("month", "Month"), col("revenue", "Revenue", "money"), col("expenses", "Expenses", "money"), col("profit", "Profit", "money")], pnl.byMonth.map((m) => ({ month: m.month, revenue: m.revenueMinor, expenses: m.expensesMinor, profit: m.profitMinor }))),
        table("Cash flow by account", [col("account", "Account"), col("type", "Type"), col("opening", "Opening", "money"), col("added", "Opened in period", "money"), col("in", "In", "money"), col("out", "Out", "money"), col("closing", "Closing", "money")], cash.accounts.map((a) => ({ account: a.name, type: a.type.replace("_", " "), opening: a.openingMinor, added: a.openedInPeriodMinor, in: a.inMinor, out: a.outMinor, closing: a.closingMinor })), { note: `Net cash flow ${cash.netCashFlowMinor / 100} ${pnl.currency}; transfers between accounts (${cash.transfersMinor / 100}) are not counted as cash in or out.` }),
        { kind: "summary", title: "Receivables (owed to the farm), by age", items: [...buckets(recv.buckets).map((b) => ({ ...b, type: "money" })), { label: "Total outstanding", value: recv.totalOutstandingMinor, type: "money" }] },
        { kind: "summary", title: "Payables (owed by the farm), by age", items: [...buckets(pay.buckets).map((b) => ({ ...b, type: "money" })), { label: "Total outstanding", value: pay.totalOutstandingMinor, type: "money" }] },
        table("Spending by supplier", [col("supplier", "Supplier"), col("amount", "Amount", "money")], exp.bySupplier.map((x) => ({ supplier: x.key, amount: x.amountMinor })), { totals: { amount: exp.totalMinor } })
      ];
    },
    async marketplace(ctx, farm, p6) {
      const tz = farm.settings.timezone;
      const [listings, orders, payments, buyers] = await Promise.all([repos.listings.find(ctx.farmId), repos.orders.find(ctx.farmId), repos.orderPayments.find(ctx.farmId, { range: { field: "date", from: p6.from, to: p6.to } }), repos.buyers.find(ctx.farmId)]);
      const buyer = new Map(buyers.map((b) => [b.id, b.name]));
      const inPeriod = orders.filter((o) => inRange(localDateOf(o.createdAt, tz), p6)).sort((a, b) => a.orderNumber - b.orderNumber);
      const sold = inPeriod.filter((o) => o.status === "delivered" || o.status === "completed");
      const byStatus = /* @__PURE__ */ new Map();
      for (const o of inPeriod) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
      const received = sum(payments.filter((x) => x.kind === "payment"), (x) => x.amount.amountMinor);
      const refunded = sum(payments.filter((x) => x.kind === "refund"), (x) => x.amount.amountMinor);
      return [
        { kind: "summary", title: "Orders placed in the period", items: [
          { label: "Orders", value: inPeriod.length, type: "number" },
          ...[...byStatus.entries()].map(([s2, n]) => ({ label: `  ${s2}`, value: n, type: "number" })),
          { label: "Delivered or completed value", value: sum(sold, (o) => o.total.amountMinor), type: "money" },
          { label: "Payments received in the period", value: received, type: "money" },
          { label: "Refunds in the period", value: refunded, type: "money" }
        ] },
        table(
          "Orders",
          [col("number", "Order", "number"), col("date", "Placed", "date"), col("channel", "Channel"), col("buyer", "Buyer"), col("item", "Item"), col("qty", "Quantity", "number"), col("unit", "Unit"), col("total", "Total", "money"), col("paid", "Paid", "money"), col("status", "Status"), col("payment", "Payment")],
          inPeriod.map((o) => ({ number: o.orderNumber, date: localDateOf(o.createdAt, tz), channel: o.channel, buyer: o.buyerName ?? (o.buyerId ? buyer.get(o.buyerId) ?? "" : ""), item: o.lines[0]?.description ?? "", qty: o.lines[0]?.quantity ?? null, unit: o.lines[0]?.unit ?? "", total: o.total.amountMinor, paid: o.amountPaid?.amountMinor ?? 0, status: o.status, payment: o.paymentStatus.replace("_", " ") })),
          { totals: { total: sum(inPeriod, (o) => o.total.amountMinor), paid: sum(inPeriod, (o) => o.amountPaid?.amountMinor ?? 0) } }
        ),
        table("Listings", [col("title", "Listing"), col("category", "Category"), col("status", "Status"), col("available", "Available", "number"), col("unit", "Unit"), col("price", "Price", "money")], listings.map((l) => ({ title: l.title, category: l.category.replace(/_/g, " "), status: l.status, available: l.quantityAvailable, unit: l.unit, price: l.price.amountMinor })))
      ];
    }
  };
  return {
    /** The reports this person may export, with what each needs. */
    async catalog(ctx) {
      assertCan(ctx, "farm.read");
      return Object.entries(REPORTS).map(([type, r]) => ({ type, title: r.title, description: r.description, available: can(ctx.role, r.permission), needsFlock: r.needsFlock, formats: ["pdf", "csv", "xlsx", "json"] }));
    },
    async build(ctx, type, q8, format) {
      const def = REPORTS[type];
      if (!def) throw notFound("Report");
      assertCan(ctx, def.permission);
      const farm = await repos.farms.findById(ctx.farmId);
      if (!farm) throw notFound("Farm");
      const p6 = period(farm, q8);
      const notes = [];
      const sections = await builders[type](ctx, farm, p6, q8, notes);
      const user = await repos.users.findById(ctx.userId);
      await repos.tx.run((tx) => d.audit.record(ctx, { action: "report.exported", entity: "report", entityId: type, after: { type, format, from: p6.from, to: p6.to, ...q8.flockId ? { flockId: q8.flockId } : {} } }, tx));
      return {
        type,
        title: def.title,
        farmName: farm.name,
        period: p6,
        generatedAt: clock.now().toISOString(),
        generatedBy: user?.fullName ?? "PoultryPilot",
        currency: farm.settings.currency,
        sections,
        notes
      };
    }
  };
}

// src/http/routes/report.routes.ts
var asciiSlug = (s2) => s2.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40) || "farm";
function reportRoutes(reports, farms) {
  const r = Router14({ mergeParams: true });
  r.get("/", validate("params", z27.object({ farmId: Id })), requireFarm(farms), requirePermission("farm.read"), async (req, res) => res.json({ items: await reports.catalog(req.farmCtx) }));
  r.get(
    "/:type",
    validate("params", z27.object({ farmId: Id, type: ReportType })),
    requireFarm(farms),
    (req, res, next) => requirePermission(REPORTS[req.params["type"]].permission)(req, res, next),
    validate("query", ReportQuery),
    async (req, res) => {
      const q8 = req.query;
      const type = req.params["type"];
      const doc = await reports.build(req.farmCtx, type, q8, q8.format);
      if (q8.format === "json") return void res.json(doc);
      const out = await renderReport(doc, q8.format);
      const name = `poultrypilot-${type}-report-${asciiSlug(doc.farmName)}-${doc.period?.from ?? ""}-to-${doc.period?.to ?? ""}.${out.extension}`;
      res.setHeader("Content-Type", out.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.send(out.bytes);
    }
  );
  return r;
}

// src/http/routes/sync.routes.ts
import { Router as Router15 } from "express";
function syncRoutes(sync, farms) {
  const r = Router15();
  r.get("/pull", validate("query", SyncPullQuery), requireFarm(farms, "query"), requirePermission("farm.read"), async (req, res) => {
    const q8 = req.query;
    res.json(await sync.pull(req.farmCtx.farmId, q8.since, q8.limit));
  });
  r.post("/push", validate("body", SyncPushRequest), requireFarm(farms, "body"), async (req, res) => {
    res.json({ results: await sync.push(req.farmCtx, req.body) });
  });
  return r;
}

// ../../node_modules/.pnpm/@asteasolutions+zod-to-openapi@7.3.4_zod@3.25.76/node_modules/@asteasolutions/zod-to-openapi/dist/index.mjs
function __rest(s2, e) {
  var t = {};
  for (var p6 in s2) if (Object.prototype.hasOwnProperty.call(s2, p6) && e.indexOf(p6) < 0)
    t[p6] = s2[p6];
  if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p6 = Object.getOwnPropertySymbols(s2); i < p6.length; i++) {
      if (e.indexOf(p6[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s2, p6[i]))
        t[p6[i]] = s2[p6[i]];
    }
  return t;
}
function isZodType(schema, typeName) {
  var _a;
  return ((_a = schema === null || schema === void 0 ? void 0 : schema._def) === null || _a === void 0 ? void 0 : _a.typeName) === typeName;
}
function isAnyZodType(schema) {
  return "_def" in schema;
}
function preserveMetadataFromModifier(zod, modifier) {
  const zodModifier = zod.ZodType.prototype[modifier];
  zod.ZodType.prototype[modifier] = function(...args) {
    const result = zodModifier.apply(this, args);
    result._def.openapi = this._def.openapi;
    return result;
  };
}
function extendZodWithOpenApi(zod) {
  if (typeof zod.ZodType.prototype.openapi !== "undefined") {
    return;
  }
  zod.ZodType.prototype.openapi = function(refOrOpenapi, metadata) {
    var _a, _b, _c, _d, _e, _f;
    const openapi = typeof refOrOpenapi === "string" ? metadata : refOrOpenapi;
    const _g = openapi !== null && openapi !== void 0 ? openapi : {}, { param } = _g, restOfOpenApi = __rest(_g, ["param"]);
    const _internal = Object.assign(Object.assign({}, (_a = this._def.openapi) === null || _a === void 0 ? void 0 : _a._internal), typeof refOrOpenapi === "string" ? { refId: refOrOpenapi } : void 0);
    const resultMetadata = Object.assign(Object.assign(Object.assign({}, (_b = this._def.openapi) === null || _b === void 0 ? void 0 : _b.metadata), restOfOpenApi), ((_d = (_c = this._def.openapi) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d.param) || param ? {
      param: Object.assign(Object.assign({}, (_f = (_e = this._def.openapi) === null || _e === void 0 ? void 0 : _e.metadata) === null || _f === void 0 ? void 0 : _f.param), param)
    } : void 0);
    const result = new this.constructor(Object.assign(Object.assign({}, this._def), { openapi: Object.assign(Object.assign({}, Object.keys(_internal).length > 0 ? { _internal } : void 0), Object.keys(resultMetadata).length > 0 ? { metadata: resultMetadata } : void 0) }));
    if (isZodType(this, "ZodObject")) {
      const originalExtend = this.extend;
      result.extend = function(...args) {
        var _a2, _b2, _c2, _d2, _e2, _f2, _g2;
        const extendedResult = originalExtend.apply(this, args);
        extendedResult._def.openapi = {
          _internal: {
            extendedFrom: ((_b2 = (_a2 = this._def.openapi) === null || _a2 === void 0 ? void 0 : _a2._internal) === null || _b2 === void 0 ? void 0 : _b2.refId) ? { refId: (_d2 = (_c2 = this._def.openapi) === null || _c2 === void 0 ? void 0 : _c2._internal) === null || _d2 === void 0 ? void 0 : _d2.refId, schema: this } : (_f2 = (_e2 = this._def.openapi) === null || _e2 === void 0 ? void 0 : _e2._internal) === null || _f2 === void 0 ? void 0 : _f2.extendedFrom
          },
          metadata: (_g2 = extendedResult._def.openapi) === null || _g2 === void 0 ? void 0 : _g2.metadata
        };
        return extendedResult;
      };
    }
    return result;
  };
  preserveMetadataFromModifier(zod, "optional");
  preserveMetadataFromModifier(zod, "nullable");
  preserveMetadataFromModifier(zod, "default");
  preserveMetadataFromModifier(zod, "transform");
  preserveMetadataFromModifier(zod, "refine");
  const zodDeepPartial = zod.ZodObject.prototype.deepPartial;
  zod.ZodObject.prototype.deepPartial = function() {
    const initialShape = this._def.shape();
    const result = zodDeepPartial.apply(this);
    const resultShape = result._def.shape();
    Object.entries(resultShape).forEach(([key, value]) => {
      var _a, _b;
      value._def.openapi = (_b = (_a = initialShape[key]) === null || _a === void 0 ? void 0 : _a._def) === null || _b === void 0 ? void 0 : _b.openapi;
    });
    result._def.openapi = void 0;
    return result;
  };
  const zodPick = zod.ZodObject.prototype.pick;
  zod.ZodObject.prototype.pick = function(...args) {
    const result = zodPick.apply(this, args);
    result._def.openapi = void 0;
    return result;
  };
  const zodOmit = zod.ZodObject.prototype.omit;
  zod.ZodObject.prototype.omit = function(...args) {
    const result = zodOmit.apply(this, args);
    result._def.openapi = void 0;
    return result;
  };
}
function isEqual(x, y) {
  if (x === null || x === void 0 || y === null || y === void 0) {
    return x === y;
  }
  if (x === y || x.valueOf() === y.valueOf()) {
    return true;
  }
  if (Array.isArray(x)) {
    if (!Array.isArray(y)) {
      return false;
    }
    if (x.length !== y.length) {
      return false;
    }
  }
  if (!(x instanceof Object) || !(y instanceof Object)) {
    return false;
  }
  const keysX = Object.keys(x);
  return Object.keys(y).every((keyY) => keysX.indexOf(keyY) !== -1) && keysX.every((key) => isEqual(x[key], y[key]));
}
function isUndefined(value) {
  return value === void 0;
}
function mapValues(object, mapper) {
  const result = {};
  Object.entries(object).forEach(([key, value]) => {
    result[key] = mapper(value);
  });
  return result;
}
function omit(object, keys) {
  const result = {};
  Object.entries(object).forEach(([key, value]) => {
    if (!keys.some((keyToOmit) => keyToOmit === key)) {
      result[key] = value;
    }
  });
  return result;
}
function omitBy(object, predicate) {
  const result = {};
  Object.entries(object).forEach(([key, value]) => {
    if (!predicate(value, key)) {
      result[key] = value;
    }
  });
  return result;
}
function compact(arr) {
  return arr.filter((elem) => !isUndefined(elem));
}
var objectEquals = isEqual;
function isString(val) {
  return typeof val === "string";
}
var OpenAPIRegistry = class {
  constructor(parents) {
    this.parents = parents;
    this._definitions = [];
  }
  get definitions() {
    var _a, _b;
    const parentDefinitions = (_b = (_a = this.parents) === null || _a === void 0 ? void 0 : _a.flatMap((par) => par.definitions)) !== null && _b !== void 0 ? _b : [];
    return [...parentDefinitions, ...this._definitions];
  }
  /**
   * Registers a new component schema under /components/schemas/${name}
   */
  register(refId, zodSchema) {
    const schemaWithRefId = this.schemaWithRefId(refId, zodSchema);
    this._definitions.push({ type: "schema", schema: schemaWithRefId });
    return schemaWithRefId;
  }
  /**
   * Registers a new parameter schema under /components/parameters/${name}
   */
  registerParameter(refId, zodSchema) {
    var _a, _b, _c;
    const schemaWithRefId = this.schemaWithRefId(refId, zodSchema);
    const currentMetadata = (_a = schemaWithRefId._def.openapi) === null || _a === void 0 ? void 0 : _a.metadata;
    const schemaWithMetadata = schemaWithRefId.openapi(Object.assign(Object.assign({}, currentMetadata), { param: Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), { name: (_c = (_b = currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : refId }) }));
    this._definitions.push({
      type: "parameter",
      schema: schemaWithMetadata
    });
    return schemaWithMetadata;
  }
  /**
   * Registers a new path that would be generated under paths:
   */
  registerPath(route) {
    this._definitions.push({
      type: "route",
      route
    });
  }
  /**
   * Registers a new webhook that would be generated under webhooks:
   */
  registerWebhook(webhook) {
    this._definitions.push({
      type: "webhook",
      webhook
    });
  }
  /**
   * Registers a raw OpenAPI component. Use this if you have a simple object instead of a Zod schema.
   *
   * @param type The component type, e.g. `schemas`, `responses`, `securitySchemes`, etc.
   * @param name The name of the object, it is the key under the component
   *             type in the resulting OpenAPI document
   * @param component The actual object to put there
   */
  registerComponent(type, name, component) {
    this._definitions.push({
      type: "component",
      componentType: type,
      name,
      component
    });
    return {
      name,
      ref: { $ref: `#/components/${type}/${name}` }
    };
  }
  schemaWithRefId(refId, zodSchema) {
    return zodSchema.openapi(refId);
  }
};
var ZodToOpenAPIError = class {
  constructor(message) {
    this.message = message;
  }
};
var ConflictError = class extends ZodToOpenAPIError {
  constructor(message, data) {
    super(message);
    this.data = data;
  }
};
var MissingParameterDataError = class extends ZodToOpenAPIError {
  constructor(data) {
    super(`Missing parameter data, please specify \`${data.missingField}\` and other OpenAPI parameter props using the \`param\` field of \`ZodSchema.openapi\``);
    this.data = data;
  }
};
function enhanceMissingParametersError(action, paramsToAdd) {
  try {
    return action();
  } catch (error) {
    if (error instanceof MissingParameterDataError) {
      throw new MissingParameterDataError(Object.assign(Object.assign({}, error.data), paramsToAdd));
    }
    throw error;
  }
}
var UnknownZodTypeError = class extends ZodToOpenAPIError {
  constructor(data) {
    super(`Unknown zod object type, please specify \`type\` and other OpenAPI props using \`ZodSchema.openapi\`.`);
    this.data = data;
  }
};
var Metadata = class {
  static getMetadata(zodSchema) {
    var _a;
    const innerSchema = this.unwrapChained(zodSchema);
    const metadata = zodSchema._def.openapi ? zodSchema._def.openapi : innerSchema._def.openapi;
    const zodDescription = (_a = zodSchema.description) !== null && _a !== void 0 ? _a : innerSchema.description;
    return {
      _internal: metadata === null || metadata === void 0 ? void 0 : metadata._internal,
      metadata: Object.assign({ description: zodDescription }, metadata === null || metadata === void 0 ? void 0 : metadata.metadata)
    };
  }
  static getInternalMetadata(zodSchema) {
    const innerSchema = this.unwrapChained(zodSchema);
    const openapi = zodSchema._def.openapi ? zodSchema._def.openapi : innerSchema._def.openapi;
    return openapi === null || openapi === void 0 ? void 0 : openapi._internal;
  }
  static getParamMetadata(zodSchema) {
    var _a, _b;
    const innerSchema = this.unwrapChained(zodSchema);
    const metadata = zodSchema._def.openapi ? zodSchema._def.openapi : innerSchema._def.openapi;
    const zodDescription = (_a = zodSchema.description) !== null && _a !== void 0 ? _a : innerSchema.description;
    return {
      _internal: metadata === null || metadata === void 0 ? void 0 : metadata._internal,
      metadata: Object.assign(Object.assign({}, metadata === null || metadata === void 0 ? void 0 : metadata.metadata), {
        // A description provided from .openapi() should be taken with higher precedence
        param: Object.assign({ description: zodDescription }, (_b = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _b === void 0 ? void 0 : _b.param)
      })
    };
  }
  /**
   * A method that omits all custom keys added to the regular OpenAPI
   * metadata properties
   */
  static buildSchemaMetadata(metadata) {
    return omitBy(omit(metadata, ["param"]), isUndefined);
  }
  static buildParameterMetadata(metadata) {
    return omitBy(metadata, isUndefined);
  }
  static applySchemaMetadata(initialData, metadata) {
    return omitBy(Object.assign(Object.assign({}, initialData), this.buildSchemaMetadata(metadata)), isUndefined);
  }
  static getRefId(zodSchema) {
    var _a;
    return (_a = this.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.refId;
  }
  static unwrapChained(schema) {
    return this.unwrapUntil(schema);
  }
  static getDefaultValue(zodSchema) {
    const unwrapped = this.unwrapUntil(zodSchema, "ZodDefault");
    return unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped._def.defaultValue();
  }
  static unwrapUntil(schema, typeName) {
    if (typeName && isZodType(schema, typeName)) {
      return schema;
    }
    if (isZodType(schema, "ZodOptional") || isZodType(schema, "ZodNullable") || isZodType(schema, "ZodBranded")) {
      return this.unwrapUntil(schema.unwrap(), typeName);
    }
    if (isZodType(schema, "ZodDefault") || isZodType(schema, "ZodReadonly")) {
      return this.unwrapUntil(schema._def.innerType, typeName);
    }
    if (isZodType(schema, "ZodEffects")) {
      return this.unwrapUntil(schema._def.schema, typeName);
    }
    if (isZodType(schema, "ZodPipeline")) {
      return this.unwrapUntil(schema._def.in, typeName);
    }
    return typeName ? void 0 : schema;
  }
  static isOptionalSchema(zodSchema) {
    return zodSchema.isOptional();
  }
};
var ArrayTransformer = class {
  transform(zodSchema, mapNullableType, mapItems) {
    var _a, _b;
    const itemType = zodSchema._def.type;
    return Object.assign(Object.assign({}, mapNullableType("array")), { items: mapItems(itemType), minItems: (_a = zodSchema._def.minLength) === null || _a === void 0 ? void 0 : _a.value, maxItems: (_b = zodSchema._def.maxLength) === null || _b === void 0 ? void 0 : _b.value });
  }
};
var BigIntTransformer = class {
  transform(mapNullableType) {
    return Object.assign(Object.assign({}, mapNullableType("string")), { pattern: `^d+$` });
  }
};
var DiscriminatedUnionTransformer = class {
  transform(zodSchema, isNullable, mapNullableOfArray, mapItem, generateSchemaRef) {
    const options = [...zodSchema.options.values()];
    const optionSchema = options.map(mapItem);
    if (isNullable) {
      return {
        oneOf: mapNullableOfArray(optionSchema, isNullable)
      };
    }
    return {
      oneOf: optionSchema,
      discriminator: this.mapDiscriminator(options, zodSchema.discriminator, generateSchemaRef)
    };
  }
  mapDiscriminator(zodObjects, discriminator, generateSchemaRef) {
    if (zodObjects.some((obj) => Metadata.getRefId(obj) === void 0)) {
      return void 0;
    }
    const mapping = {};
    zodObjects.forEach((obj) => {
      var _a;
      const refId = Metadata.getRefId(obj);
      const value = (_a = obj.shape) === null || _a === void 0 ? void 0 : _a[discriminator];
      if (isZodType(value, "ZodEnum") || isZodType(value, "ZodNativeEnum")) {
        const keys = Object.values(value.enum).filter(isString);
        keys.forEach((enumValue) => {
          mapping[enumValue] = generateSchemaRef(refId);
        });
        return;
      }
      const literalValue = value === null || value === void 0 ? void 0 : value._def.value;
      if (typeof literalValue !== "string") {
        throw new Error(`Discriminator ${discriminator} could not be found in one of the values of a discriminated union`);
      }
      mapping[literalValue] = generateSchemaRef(refId);
    });
    return {
      propertyName: discriminator,
      mapping
    };
  }
};
var EnumTransformer = class {
  transform(zodSchema, mapNullableType) {
    return Object.assign(Object.assign({}, mapNullableType("string")), { enum: zodSchema._def.values });
  }
};
var IntersectionTransformer = class {
  transform(zodSchema, isNullable, mapNullableOfArray, mapItem) {
    const subtypes = this.flattenIntersectionTypes(zodSchema);
    const allOfSchema = {
      allOf: subtypes.map(mapItem)
    };
    if (isNullable) {
      return {
        anyOf: mapNullableOfArray([allOfSchema], isNullable)
      };
    }
    return allOfSchema;
  }
  flattenIntersectionTypes(schema) {
    if (!isZodType(schema, "ZodIntersection")) {
      return [schema];
    }
    const leftSubTypes = this.flattenIntersectionTypes(schema._def.left);
    const rightSubTypes = this.flattenIntersectionTypes(schema._def.right);
    return [...leftSubTypes, ...rightSubTypes];
  }
};
var LiteralTransformer = class {
  transform(zodSchema, mapNullableType) {
    return Object.assign(Object.assign({}, mapNullableType(typeof zodSchema._def.value)), { enum: [zodSchema._def.value] });
  }
};
function enumInfo(enumObject) {
  const keysExceptReverseMappings = Object.keys(enumObject).filter((key) => typeof enumObject[enumObject[key]] !== "number");
  const values = keysExceptReverseMappings.map((key) => enumObject[key]);
  const numericCount = values.filter((_) => typeof _ === "number").length;
  const type = numericCount === 0 ? "string" : numericCount === values.length ? "numeric" : "mixed";
  return { values, type };
}
var NativeEnumTransformer = class {
  transform(zodSchema, mapNullableType) {
    const { type, values } = enumInfo(zodSchema._def.values);
    if (type === "mixed") {
      throw new ZodToOpenAPIError("Enum has mixed string and number values, please specify the OpenAPI type manually");
    }
    return Object.assign(Object.assign({}, mapNullableType(type === "numeric" ? "integer" : "string")), { enum: values });
  }
};
var NumberTransformer = class {
  transform(zodSchema, mapNullableType, getNumberChecks) {
    return Object.assign(Object.assign({}, mapNullableType(zodSchema.isInt ? "integer" : "number")), getNumberChecks(zodSchema._def.checks));
  }
};
var ObjectTransformer = class {
  transform(zodSchema, defaultValue, mapNullableType, mapItem) {
    var _a;
    const extendedFrom = (_a = Metadata.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.extendedFrom;
    const required = this.requiredKeysOf(zodSchema);
    const properties = mapValues(zodSchema._def.shape(), mapItem);
    if (!extendedFrom) {
      return Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType("object")), { properties, default: defaultValue }), required.length > 0 ? { required } : {}), this.generateAdditionalProperties(zodSchema, mapItem));
    }
    const parent = extendedFrom.schema;
    mapItem(parent);
    const keysRequiredByParent = this.requiredKeysOf(parent);
    const propsOfParent = mapValues(parent === null || parent === void 0 ? void 0 : parent._def.shape(), mapItem);
    const propertiesToAdd = Object.fromEntries(Object.entries(properties).filter(([key, type]) => {
      return !objectEquals(propsOfParent[key], type);
    }));
    const additionallyRequired = required.filter((prop) => !keysRequiredByParent.includes(prop));
    const objectData = Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType("object")), { default: defaultValue, properties: propertiesToAdd }), additionallyRequired.length > 0 ? { required: additionallyRequired } : {}), this.generateAdditionalProperties(zodSchema, mapItem));
    return {
      allOf: [
        { $ref: `#/components/schemas/${extendedFrom.refId}` },
        objectData
      ]
    };
  }
  generateAdditionalProperties(zodSchema, mapItem) {
    const unknownKeysOption = zodSchema._def.unknownKeys;
    const catchallSchema = zodSchema._def.catchall;
    if (isZodType(catchallSchema, "ZodNever")) {
      if (unknownKeysOption === "strict") {
        return { additionalProperties: false };
      }
      return {};
    }
    return { additionalProperties: mapItem(catchallSchema) };
  }
  requiredKeysOf(objectSchema) {
    return Object.entries(objectSchema._def.shape()).filter(([_key, type]) => !Metadata.isOptionalSchema(type)).map(([key, _type]) => key);
  }
};
var RecordTransformer = class {
  transform(zodSchema, mapNullableType, mapItem) {
    const propertiesType = zodSchema._def.valueType;
    const keyType = zodSchema._def.keyType;
    const propertiesSchema = mapItem(propertiesType);
    if (isZodType(keyType, "ZodEnum") || isZodType(keyType, "ZodNativeEnum")) {
      const keys = Object.values(keyType.enum).filter(isString);
      const properties = keys.reduce((acc, curr) => Object.assign(Object.assign({}, acc), { [curr]: propertiesSchema }), {});
      return Object.assign(Object.assign({}, mapNullableType("object")), { properties });
    }
    return Object.assign(Object.assign({}, mapNullableType("object")), { additionalProperties: propertiesSchema });
  }
};
var StringTransformer = class {
  transform(zodSchema, mapNullableType) {
    var _a, _b, _c;
    const regexCheck = this.getZodStringCheck(zodSchema, "regex");
    const length = (_a = this.getZodStringCheck(zodSchema, "length")) === null || _a === void 0 ? void 0 : _a.value;
    const maxLength = Number.isFinite(zodSchema.minLength) ? (_b = zodSchema.minLength) !== null && _b !== void 0 ? _b : void 0 : void 0;
    const minLength = Number.isFinite(zodSchema.maxLength) ? (_c = zodSchema.maxLength) !== null && _c !== void 0 ? _c : void 0 : void 0;
    return Object.assign(Object.assign({}, mapNullableType("string")), {
      // FIXME: https://github.com/colinhacks/zod/commit/d78047e9f44596a96d637abb0ce209cd2732d88c
      minLength: length !== null && length !== void 0 ? length : maxLength,
      maxLength: length !== null && length !== void 0 ? length : minLength,
      format: this.mapStringFormat(zodSchema),
      pattern: regexCheck === null || regexCheck === void 0 ? void 0 : regexCheck.regex.source
    });
  }
  /**
   * Attempts to map Zod strings to known formats
   * https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
   */
  mapStringFormat(zodString) {
    if (zodString.isUUID)
      return "uuid";
    if (zodString.isEmail)
      return "email";
    if (zodString.isURL)
      return "uri";
    if (zodString.isDate)
      return "date";
    if (zodString.isDatetime)
      return "date-time";
    if (zodString.isCUID)
      return "cuid";
    if (zodString.isCUID2)
      return "cuid2";
    if (zodString.isULID)
      return "ulid";
    if (zodString.isIP)
      return "ip";
    if (zodString.isEmoji)
      return "emoji";
    return void 0;
  }
  getZodStringCheck(zodString, kind) {
    return zodString._def.checks.find((check) => {
      return check.kind === kind;
    });
  }
};
var TupleTransformer = class {
  constructor(versionSpecifics) {
    this.versionSpecifics = versionSpecifics;
  }
  transform(zodSchema, mapNullableType, mapItem) {
    const { items } = zodSchema._def;
    const schemas = items.map(mapItem);
    return Object.assign(Object.assign({}, mapNullableType("array")), this.versionSpecifics.mapTupleItems(schemas));
  }
};
var UnionTransformer = class {
  transform(zodSchema, mapNullableOfArray, mapItem) {
    const options = this.flattenUnionTypes(zodSchema);
    const schemas = options.map((schema) => {
      const optionToGenerate = this.unwrapNullable(schema);
      return mapItem(optionToGenerate);
    });
    return {
      anyOf: mapNullableOfArray(schemas)
    };
  }
  flattenUnionTypes(schema) {
    if (!isZodType(schema, "ZodUnion")) {
      return [schema];
    }
    const options = schema._def.options;
    return options.flatMap((option) => this.flattenUnionTypes(option));
  }
  unwrapNullable(schema) {
    if (isZodType(schema, "ZodNullable")) {
      return this.unwrapNullable(schema.unwrap());
    }
    return schema;
  }
};
var OpenApiTransformer = class {
  constructor(versionSpecifics) {
    this.versionSpecifics = versionSpecifics;
    this.objectTransformer = new ObjectTransformer();
    this.stringTransformer = new StringTransformer();
    this.numberTransformer = new NumberTransformer();
    this.bigIntTransformer = new BigIntTransformer();
    this.literalTransformer = new LiteralTransformer();
    this.enumTransformer = new EnumTransformer();
    this.nativeEnumTransformer = new NativeEnumTransformer();
    this.arrayTransformer = new ArrayTransformer();
    this.unionTransformer = new UnionTransformer();
    this.discriminatedUnionTransformer = new DiscriminatedUnionTransformer();
    this.intersectionTransformer = new IntersectionTransformer();
    this.recordTransformer = new RecordTransformer();
    this.tupleTransformer = new TupleTransformer(versionSpecifics);
  }
  transform(zodSchema, isNullable, mapItem, generateSchemaRef, defaultValue) {
    if (isZodType(zodSchema, "ZodNull")) {
      return this.versionSpecifics.nullType;
    }
    if (isZodType(zodSchema, "ZodUnknown") || isZodType(zodSchema, "ZodAny")) {
      return this.versionSpecifics.mapNullableType(void 0, isNullable);
    }
    if (isZodType(zodSchema, "ZodObject")) {
      return this.objectTransformer.transform(
        zodSchema,
        defaultValue,
        // verified on TS level from input
        // verified on TS level from input
        (_) => this.versionSpecifics.mapNullableType(_, isNullable),
        mapItem
      );
    }
    const schema = this.transformSchemaWithoutDefault(zodSchema, isNullable, mapItem, generateSchemaRef);
    return Object.assign(Object.assign({}, schema), { default: defaultValue });
  }
  transformSchemaWithoutDefault(zodSchema, isNullable, mapItem, generateSchemaRef) {
    if (isZodType(zodSchema, "ZodUnknown") || isZodType(zodSchema, "ZodAny")) {
      return this.versionSpecifics.mapNullableType(void 0, isNullable);
    }
    if (isZodType(zodSchema, "ZodString")) {
      return this.stringTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
    }
    if (isZodType(zodSchema, "ZodNumber")) {
      return this.numberTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable), (_) => this.versionSpecifics.getNumberChecks(_));
    }
    if (isZodType(zodSchema, "ZodBigInt")) {
      return this.bigIntTransformer.transform((schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
    }
    if (isZodType(zodSchema, "ZodBoolean")) {
      return this.versionSpecifics.mapNullableType("boolean", isNullable);
    }
    if (isZodType(zodSchema, "ZodLiteral")) {
      return this.literalTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
    }
    if (isZodType(zodSchema, "ZodEnum")) {
      return this.enumTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
    }
    if (isZodType(zodSchema, "ZodNativeEnum")) {
      return this.nativeEnumTransformer.transform(zodSchema, (schema) => this.versionSpecifics.mapNullableType(schema, isNullable));
    }
    if (isZodType(zodSchema, "ZodArray")) {
      return this.arrayTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
    }
    if (isZodType(zodSchema, "ZodTuple")) {
      return this.tupleTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
    }
    if (isZodType(zodSchema, "ZodUnion")) {
      return this.unionTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
    }
    if (isZodType(zodSchema, "ZodDiscriminatedUnion")) {
      return this.discriminatedUnionTransformer.transform(zodSchema, isNullable, (_) => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem, generateSchemaRef);
    }
    if (isZodType(zodSchema, "ZodIntersection")) {
      return this.intersectionTransformer.transform(zodSchema, isNullable, (_) => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
    }
    if (isZodType(zodSchema, "ZodRecord")) {
      return this.recordTransformer.transform(zodSchema, (_) => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
    }
    if (isZodType(zodSchema, "ZodDate")) {
      return this.versionSpecifics.mapNullableType("string", isNullable);
    }
    const refId = Metadata.getRefId(zodSchema);
    throw new UnknownZodTypeError({
      currentSchema: zodSchema._def,
      schemaName: refId
    });
  }
};
var OpenAPIGenerator = class {
  constructor(definitions, versionSpecifics) {
    this.definitions = definitions;
    this.versionSpecifics = versionSpecifics;
    this.schemaRefs = {};
    this.paramRefs = {};
    this.pathRefs = {};
    this.rawComponents = [];
    this.openApiTransformer = new OpenApiTransformer(versionSpecifics);
    this.sortDefinitions();
  }
  generateDocumentData() {
    this.definitions.forEach((definition) => this.generateSingle(definition));
    return {
      components: this.buildComponents(),
      paths: this.pathRefs
    };
  }
  generateComponents() {
    this.definitions.forEach((definition) => this.generateSingle(definition));
    return {
      components: this.buildComponents()
    };
  }
  buildComponents() {
    var _a, _b;
    const rawComponents = {};
    this.rawComponents.forEach(({ componentType, name, component }) => {
      var _a2;
      (_a2 = rawComponents[componentType]) !== null && _a2 !== void 0 ? _a2 : rawComponents[componentType] = {};
      rawComponents[componentType][name] = component;
    });
    return Object.assign(Object.assign({}, rawComponents), { schemas: Object.assign(Object.assign({}, (_a = rawComponents.schemas) !== null && _a !== void 0 ? _a : {}), this.schemaRefs), parameters: Object.assign(Object.assign({}, (_b = rawComponents.parameters) !== null && _b !== void 0 ? _b : {}), this.paramRefs) });
  }
  sortDefinitions() {
    const generationOrder = [
      "schema",
      "parameter",
      "component",
      "route"
    ];
    this.definitions.sort((left, right) => {
      if (!("type" in left)) {
        if (!("type" in right)) {
          return 0;
        }
        return -1;
      }
      if (!("type" in right)) {
        return 1;
      }
      const leftIndex = generationOrder.findIndex((type) => type === left.type);
      const rightIndex = generationOrder.findIndex((type) => type === right.type);
      return leftIndex - rightIndex;
    });
  }
  generateSingle(definition) {
    if (!("type" in definition)) {
      this.generateSchemaWithRef(definition);
      return;
    }
    switch (definition.type) {
      case "parameter":
        this.generateParameterDefinition(definition.schema);
        return;
      case "schema":
        this.generateSchemaWithRef(definition.schema);
        return;
      case "route":
        this.generateSingleRoute(definition.route);
        return;
      case "component":
        this.rawComponents.push(definition);
        return;
    }
  }
  generateParameterDefinition(zodSchema) {
    const refId = Metadata.getRefId(zodSchema);
    const result = this.generateParameter(zodSchema);
    if (refId) {
      this.paramRefs[refId] = result;
    }
    return result;
  }
  getParameterRef(schemaMetadata, external) {
    var _a, _b, _c, _d, _e;
    const parameterMetadata = (_a = schemaMetadata === null || schemaMetadata === void 0 ? void 0 : schemaMetadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
    const existingRef = ((_b = schemaMetadata === null || schemaMetadata === void 0 ? void 0 : schemaMetadata._internal) === null || _b === void 0 ? void 0 : _b.refId) ? this.paramRefs[(_c = schemaMetadata._internal) === null || _c === void 0 ? void 0 : _c.refId] : void 0;
    if (!((_d = schemaMetadata === null || schemaMetadata === void 0 ? void 0 : schemaMetadata._internal) === null || _d === void 0 ? void 0 : _d.refId) || !existingRef) {
      return void 0;
    }
    if (parameterMetadata && existingRef.in !== parameterMetadata.in || (external === null || external === void 0 ? void 0 : external.in) && existingRef.in !== external.in) {
      throw new ConflictError(`Conflicting location for parameter ${existingRef.name}`, {
        key: "in",
        values: compact([
          existingRef.in,
          external === null || external === void 0 ? void 0 : external.in,
          parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.in
        ])
      });
    }
    if (parameterMetadata && existingRef.name !== parameterMetadata.name || (external === null || external === void 0 ? void 0 : external.name) && existingRef.name !== (external === null || external === void 0 ? void 0 : external.name)) {
      throw new ConflictError(`Conflicting names for parameter`, {
        key: "name",
        values: compact([
          existingRef.name,
          external === null || external === void 0 ? void 0 : external.name,
          parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.name
        ])
      });
    }
    return {
      $ref: `#/components/parameters/${(_e = schemaMetadata._internal) === null || _e === void 0 ? void 0 : _e.refId}`
    };
  }
  generateInlineParameters(zodSchema, location) {
    var _a;
    const metadata = Metadata.getMetadata(zodSchema);
    const parameterMetadata = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
    const referencedSchema = this.getParameterRef(metadata, { in: location });
    if (referencedSchema) {
      return [referencedSchema];
    }
    if (isZodType(zodSchema, "ZodObject")) {
      const propTypes = zodSchema._def.shape();
      const parameters = Object.entries(propTypes).map(([key, schema]) => {
        var _a2, _b;
        const innerMetadata = Metadata.getMetadata(schema);
        const referencedSchema2 = this.getParameterRef(innerMetadata, {
          in: location,
          name: key
        });
        if (referencedSchema2) {
          return referencedSchema2;
        }
        const innerParameterMetadata = (_a2 = innerMetadata === null || innerMetadata === void 0 ? void 0 : innerMetadata.metadata) === null || _a2 === void 0 ? void 0 : _a2.param;
        if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.name) && innerParameterMetadata.name !== key) {
          throw new ConflictError(`Conflicting names for parameter`, {
            key: "name",
            values: [key, innerParameterMetadata.name]
          });
        }
        if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.in) && innerParameterMetadata.in !== location) {
          throw new ConflictError(`Conflicting location for parameter ${(_b = innerParameterMetadata.name) !== null && _b !== void 0 ? _b : key}`, {
            key: "in",
            values: [location, innerParameterMetadata.in]
          });
        }
        return this.generateParameter(schema.openapi({ param: { name: key, in: location } }));
      });
      return parameters;
    }
    if ((parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.in) && parameterMetadata.in !== location) {
      throw new ConflictError(`Conflicting location for parameter ${parameterMetadata.name}`, {
        key: "in",
        values: [location, parameterMetadata.in]
      });
    }
    return [
      this.generateParameter(zodSchema.openapi({ param: { in: location } }))
    ];
  }
  generateSimpleParameter(zodSchema) {
    var _a;
    const metadata = Metadata.getParamMetadata(zodSchema);
    const paramMetadata = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
    const required = !Metadata.isOptionalSchema(zodSchema) && !zodSchema.isNullable();
    const schema = this.generateSchemaWithRef(zodSchema);
    return Object.assign({
      schema,
      required
    }, paramMetadata ? Metadata.buildParameterMetadata(paramMetadata) : {});
  }
  generateParameter(zodSchema) {
    var _a;
    const metadata = Metadata.getMetadata(zodSchema);
    const paramMetadata = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
    const paramName = paramMetadata === null || paramMetadata === void 0 ? void 0 : paramMetadata.name;
    const paramLocation = paramMetadata === null || paramMetadata === void 0 ? void 0 : paramMetadata.in;
    if (!paramName) {
      throw new MissingParameterDataError({ missingField: "name" });
    }
    if (!paramLocation) {
      throw new MissingParameterDataError({
        missingField: "in",
        paramName
      });
    }
    const baseParameter = this.generateSimpleParameter(zodSchema);
    return Object.assign(Object.assign({}, baseParameter), { in: paramLocation, name: paramName });
  }
  generateSchemaWithMetadata(zodSchema) {
    var _a;
    const innerSchema = Metadata.unwrapChained(zodSchema);
    const metadata = Metadata.getMetadata(zodSchema);
    const defaultValue = Metadata.getDefaultValue(zodSchema);
    const result = ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.type) ? { type: metadata === null || metadata === void 0 ? void 0 : metadata.metadata.type } : this.toOpenAPISchema(innerSchema, zodSchema.isNullable(), defaultValue);
    return (metadata === null || metadata === void 0 ? void 0 : metadata.metadata) ? Metadata.applySchemaMetadata(result, metadata.metadata) : omitBy(result, isUndefined);
  }
  /**
   * Same as above but applies nullable
   */
  constructReferencedOpenAPISchema(zodSchema) {
    var _a;
    const metadata = Metadata.getMetadata(zodSchema);
    const innerSchema = Metadata.unwrapChained(zodSchema);
    const defaultValue = Metadata.getDefaultValue(zodSchema);
    const isNullableSchema = zodSchema.isNullable();
    if ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.type) {
      return this.versionSpecifics.mapNullableType(metadata.metadata.type, isNullableSchema);
    }
    return this.toOpenAPISchema(innerSchema, isNullableSchema, defaultValue);
  }
  /**
   * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
   */
  generateSimpleSchema(zodSchema) {
    var _a;
    const metadata = Metadata.getMetadata(zodSchema);
    const refId = Metadata.getRefId(zodSchema);
    if (!refId || !this.schemaRefs[refId]) {
      return this.generateSchemaWithMetadata(zodSchema);
    }
    const schemaRef = this.schemaRefs[refId];
    const referenceObject = {
      $ref: this.generateSchemaRef(refId)
    };
    const newMetadata = omitBy(Metadata.buildSchemaMetadata((_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) !== null && _a !== void 0 ? _a : {}), (value, key) => value === void 0 || objectEquals(value, schemaRef[key]));
    if (newMetadata.type) {
      return {
        allOf: [referenceObject, newMetadata]
      };
    }
    const newSchemaMetadata = omitBy(this.constructReferencedOpenAPISchema(zodSchema), (value, key) => value === void 0 || objectEquals(value, schemaRef[key]));
    const appliedMetadata = Metadata.applySchemaMetadata(newSchemaMetadata, newMetadata);
    if (Object.keys(appliedMetadata).length > 0) {
      return {
        allOf: [referenceObject, appliedMetadata]
      };
    }
    return referenceObject;
  }
  /**
   * Same as `generateSchema` but if the new schema is added into the
   * referenced schemas, it would return a ReferenceObject and not the
   * whole result.
   *
   * Should be used for nested objects, arrays, etc.
   */
  generateSchemaWithRef(zodSchema) {
    const refId = Metadata.getRefId(zodSchema);
    const result = this.generateSimpleSchema(zodSchema);
    if (refId && this.schemaRefs[refId] === void 0) {
      this.schemaRefs[refId] = result;
      return { $ref: this.generateSchemaRef(refId) };
    }
    return result;
  }
  generateSchemaRef(refId) {
    return `#/components/schemas/${refId}`;
  }
  getRequestBody(requestBody) {
    if (!requestBody) {
      return;
    }
    const { content } = requestBody, rest = __rest(requestBody, ["content"]);
    const requestBodyContent = this.getBodyContent(content);
    return Object.assign(Object.assign({}, rest), { content: requestBodyContent });
  }
  getParameters(request) {
    if (!request) {
      return [];
    }
    const { headers } = request;
    const query = this.cleanParameter(request.query);
    const params = this.cleanParameter(request.params);
    const cookies = this.cleanParameter(request.cookies);
    const queryParameters = enhanceMissingParametersError(() => query ? this.generateInlineParameters(query, "query") : [], { location: "query" });
    const pathParameters = enhanceMissingParametersError(() => params ? this.generateInlineParameters(params, "path") : [], { location: "path" });
    const cookieParameters = enhanceMissingParametersError(() => cookies ? this.generateInlineParameters(cookies, "cookie") : [], { location: "cookie" });
    const headerParameters = enhanceMissingParametersError(() => {
      if (Array.isArray(headers)) {
        return headers.flatMap((header) => this.generateInlineParameters(header, "header"));
      }
      const cleanHeaders = this.cleanParameter(headers);
      return cleanHeaders ? this.generateInlineParameters(cleanHeaders, "header") : [];
    }, { location: "header" });
    return [
      ...pathParameters,
      ...queryParameters,
      ...headerParameters,
      ...cookieParameters
    ];
  }
  cleanParameter(schema) {
    if (!schema) {
      return void 0;
    }
    return isZodType(schema, "ZodEffects") ? this.cleanParameter(schema._def.schema) : schema;
  }
  generatePath(route) {
    const { method, path, request, responses } = route, pathItemConfig = __rest(route, ["method", "path", "request", "responses"]);
    const generatedResponses = mapValues(responses, (response) => {
      return this.getResponse(response);
    });
    const parameters = enhanceMissingParametersError(() => this.getParameters(request), { route: `${method} ${path}` });
    const requestBody = this.getRequestBody(request === null || request === void 0 ? void 0 : request.body);
    const routeDoc = {
      [method]: Object.assign(Object.assign(Object.assign(Object.assign({}, pathItemConfig), parameters.length > 0 ? {
        parameters: [...pathItemConfig.parameters || [], ...parameters]
      } : {}), requestBody ? { requestBody } : {}), { responses: generatedResponses })
    };
    return routeDoc;
  }
  generateSingleRoute(route) {
    const routeDoc = this.generatePath(route);
    this.pathRefs[route.path] = Object.assign(Object.assign({}, this.pathRefs[route.path]), routeDoc);
    return routeDoc;
  }
  getResponse(response) {
    if (this.isReferenceObject(response)) {
      return response;
    }
    const { content, headers } = response, rest = __rest(response, ["content", "headers"]);
    const responseContent = content ? { content: this.getBodyContent(content) } : {};
    if (!headers) {
      return Object.assign(Object.assign({}, rest), responseContent);
    }
    const responseHeaders = isZodType(headers, "ZodObject") ? this.getResponseHeaders(headers) : (
      // This is input data so it is okay to cast in the common generator
      // since this is the user's responsibility to keep it correct
      headers
    );
    return Object.assign(Object.assign(Object.assign({}, rest), { headers: responseHeaders }), responseContent);
  }
  isReferenceObject(schema) {
    return "$ref" in schema;
  }
  getResponseHeaders(headers) {
    const schemaShape = headers._def.shape();
    const responseHeaders = mapValues(schemaShape, (_) => this.generateSimpleParameter(_));
    return responseHeaders;
  }
  getBodyContent(content) {
    return mapValues(content, (config) => {
      if (!config || !isAnyZodType(config.schema)) {
        return config;
      }
      const { schema: configSchema } = config, rest = __rest(config, ["schema"]);
      const schema = this.generateSchemaWithRef(configSchema);
      return Object.assign({ schema }, rest);
    });
  }
  toOpenAPISchema(zodSchema, isNullable, defaultValue) {
    return this.openApiTransformer.transform(zodSchema, isNullable, (_) => this.generateSchemaWithRef(_), (_) => this.generateSchemaRef(_), defaultValue);
  }
};
var OpenApiGeneratorV31Specifics = class {
  get nullType() {
    return { type: "null" };
  }
  mapNullableOfArray(objects, isNullable) {
    if (isNullable) {
      return [...objects, this.nullType];
    }
    return objects;
  }
  mapNullableType(type, isNullable) {
    if (!type) {
      return {};
    }
    if (isNullable) {
      return {
        type: Array.isArray(type) ? [...type, "null"] : [type, "null"]
      };
    }
    return {
      type
    };
  }
  mapTupleItems(schemas) {
    return {
      prefixItems: schemas
    };
  }
  getNumberChecks(checks) {
    return Object.assign({}, ...checks.map((check) => {
      switch (check.kind) {
        case "min":
          return check.inclusive ? { minimum: Number(check.value) } : { exclusiveMinimum: Number(check.value) };
        case "max":
          return check.inclusive ? { maximum: Number(check.value) } : { exclusiveMaximum: Number(check.value) };
        default:
          return {};
      }
    }));
  }
};
function isWebhookDefinition(definition) {
  return "type" in definition && definition.type === "webhook";
}
var OpenApiGeneratorV31 = class {
  constructor(definitions) {
    this.definitions = definitions;
    this.webhookRefs = {};
    const specifics = new OpenApiGeneratorV31Specifics();
    this.generator = new OpenAPIGenerator(this.definitions, specifics);
  }
  generateDocument(config) {
    const baseDocument = this.generator.generateDocumentData();
    this.definitions.filter(isWebhookDefinition).forEach((definition) => this.generateSingleWebhook(definition.webhook));
    return Object.assign(Object.assign(Object.assign({}, config), baseDocument), { webhooks: this.webhookRefs });
  }
  generateComponents() {
    return this.generator.generateComponents();
  }
  generateSingleWebhook(route) {
    const routeDoc = this.generator.generatePath(route);
    this.webhookRefs[route.path] = Object.assign(Object.assign({}, this.webhookRefs[route.path]), routeDoc);
    return routeDoc;
  }
};

// ../../packages/contracts/src/openapi.ts
import { z as z28 } from "zod";
extendZodWithOpenApi(z28);
var registry = new OpenAPIRegistry();
var bearer = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT"
});
var secured = [{ [bearer.name]: [] }];
var S = {
  ErrorEnvelope: registry.register("ErrorEnvelope", ErrorEnvelope),
  HealthResponse: registry.register("HealthResponse", HealthResponse),
  LivenessResponse: registry.register("LivenessResponse", LivenessResponse),
  DeviceInfo: registry.register("DeviceInfo", DeviceInfo),
  RegisterRequest: registry.register("RegisterRequest", RegisterRequest),
  LoginRequest: registry.register("LoginRequest", LoginRequest),
  GoogleLoginRequest: registry.register("GoogleLoginRequest", GoogleLoginRequest),
  RefreshRequest: registry.register("RefreshRequest", RefreshRequest),
  LogoutRequest: registry.register("LogoutRequest", LogoutRequest),
  VerifyEmailRequest: registry.register("VerifyEmailRequest", VerifyEmailRequest),
  ForgotPasswordRequest: registry.register("ForgotPasswordRequest", ForgotPasswordRequest),
  ResetPasswordRequest: registry.register("ResetPasswordRequest", ResetPasswordRequest),
  ChangePasswordRequest: registry.register("ChangePasswordRequest", ChangePasswordRequest),
  TokenPair: registry.register("TokenPair", TokenPair),
  UserView: registry.register("UserView", UserView),
  SessionView: registry.register("SessionView", SessionView),
  MeResponse: registry.register("MeResponse", MeResponse),
  FarmView: registry.register("FarmView", FarmView),
  CreateFarmRequest: registry.register("CreateFarmRequest", CreateFarmRequest),
  ReplaceFarmRequest: registry.register("ReplaceFarmRequest", ReplaceFarmRequest),
  MembershipView: registry.register("MembershipView", MembershipView),
  AddMemberRequest: registry.register("AddMemberRequest", AddMemberRequest),
  UpdateMemberRequest: registry.register("UpdateMemberRequest", UpdateMemberRequest),
  AcceptInviteRequest: registry.register("AcceptInviteRequest", AcceptInviteRequest),
  SyncPushRequest: registry.register("SyncPushRequest", SyncPushRequest),
  HouseView: registry.register("HouseView", HouseView),
  CreateHouseRequest: registry.register("CreateHouseRequest", CreateHouseRequest),
  ReplaceHouseRequest: registry.register("ReplaceHouseRequest", ReplaceHouseRequest),
  FlockView: registry.register("FlockView", FlockView),
  FlockMetricsView: registry.register("FlockMetricsView", FlockMetricsView),
  FlockEventView: registry.register("FlockEventView", FlockEventView),
  DailyRecordView: registry.register("DailyRecordView", DailyRecordView),
  CreateFlockRequest: registry.register("CreateFlockRequest", CreateFlockRequest),
  ReplaceFlockRequest: registry.register("ReplaceFlockRequest", ReplaceFlockRequest),
  UpsertDailyRecordRequest: registry.register("UpsertDailyRecordRequest", UpsertDailyRecordRequest),
  CreateDailyRecordRequest: registry.register("CreateDailyRecordRequest", CreateDailyRecordRequest),
  UpdateDailyRecordRequest: registry.register("UpdateDailyRecordRequest", UpdateDailyRecordRequest),
  DailyRecordListItem: registry.register("DailyRecordListItem", DailyRecordListItem),
  DailyRecordMinimal: registry.register("DailyRecordMinimal", DailyRecordMinimal),
  DailyEntrySheet: registry.register("DailyEntrySheet", DailyEntrySheet),
  DashboardDayView: registry.register("DashboardDayView", DashboardDayView),
  TrendsView: registry.register("TrendsView", TrendsView),
  MediaAssetView: registry.register("MediaAssetView", MediaAssetView),
  SyncChange: registry.register("SyncChange", SyncChange)
};
var json = (schema, description) => ({
  description,
  content: { "application/json": { schema } }
});
var errors = {
  400: json(S.ErrorEnvelope, "Validation failed"),
  401: json(S.ErrorEnvelope, "Not signed in"),
  403: json(S.ErrorEnvelope, "Role not allowed"),
  404: json(S.ErrorEnvelope, "Not found or not a member"),
  429: json(S.ErrorEnvelope, "Rate limited")
};
var idempotencyHeader = z28.object({ [HEADERS.idempotencyKey]: z28.string().min(8).max(100).optional() });
var farmParams2 = z28.object({ farmId: Id });
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/health`,
  tags: ["System"],
  summary: "Service health including MongoDB connectivity",
  responses: {
    200: json(S.HealthResponse, "All dependencies up"),
    503: json(S.HealthResponse, "A dependency is down")
  }
});
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/health/live`,
  tags: ["System"],
  summary: "Liveness probe; no dependency checks",
  responses: { 200: json(S.LivenessResponse, "Process is running") }
});
var post = (path, summary, request, responses, auth = false) => registry.registerPath({ method: "post", path: `${API_PREFIX}${path}`, tags: [path.startsWith("/auth") ? "Auth" : "Farms"], summary, ...request ? { request } : {}, responses, ...auth ? { security: secured } : {} });
var bodyOf = (schema) => ({ body: { content: { "application/json": { schema } } } });
var signedIn = z28.object({ user: S.UserView, tokens: S.TokenPair });
post("/auth/register", "Create an account and its first farm; sends a verification email", bodyOf(S.RegisterRequest), {
  201: json(z28.object({ user: S.UserView, farm: S.FarmView, tokens: S.TokenPair }), "Registered and signed in"),
  400: errors[400],
  409: json(S.ErrorEnvelope, "Email already registered"),
  429: errors[429]
});
post("/auth/verify-email", "Confirm an email address with the emailed token", bodyOf(S.VerifyEmailRequest), { 200: json(z28.object({ user: S.UserView }), "Verified"), 422: json(S.ErrorEnvelope, "Invalid or expired token") });
post("/auth/resend-verification", "Send a new verification email", void 0, { 202: json(z28.object({ sent: z28.boolean() }), "Sent, or already verified"), 401: errors[401] }, true);
post("/auth/login", "Sign in with email and password; starts a session", bodyOf(S.LoginRequest), {
  200: json(signedIn, "Signed in"),
  401: errors[401],
  403: json(S.ErrorEnvelope, "Account disabled"),
  429: json(S.ErrorEnvelope, "Rate limited or account temporarily locked")
});
post("/auth/google", "Sign in with a Google ID token", bodyOf(S.GoogleLoginRequest), {
  200: json(signedIn.extend({ created: z28.boolean(), needsFarm: z28.boolean() }), "Signed in"),
  401: errors[401],
  501: json(S.ErrorEnvelope, "Google sign-in not configured")
});
post("/auth/refresh", "Rotate a refresh token; reuse of an old token ends the session", bodyOf(S.RefreshRequest), { 200: json(S.TokenPair, "New token pair"), 401: errors[401] });
post("/auth/logout", "End the current session (bearer token) or the session of a refresh token", bodyOf(S.LogoutRequest), { 204: { description: "Signed out" } });
post("/auth/forgot-password", "Email a password reset link; never reveals whether the account exists", bodyOf(S.ForgotPasswordRequest), { 202: json(z28.object({ message: z28.string() }), "Accepted"), 429: errors[429] });
post("/auth/reset-password", "Set a new password with an emailed token; signs out every session", bodyOf(S.ResetPasswordRequest), { 204: { description: "Password reset" }, 422: json(S.ErrorEnvelope, "Invalid or expired token") });
post("/auth/change-password", "Change password; signs out every other session", bodyOf(S.ChangePasswordRequest), {
  200: json(z28.object({ otherSessionsSignedOut: z28.number() }), "Changed"),
  401: errors[401],
  422: json(S.ErrorEnvelope, "Current password incorrect or unchanged")
}, true);
registry.registerPath({ method: "get", path: `${API_PREFIX}/me`, tags: ["Me"], security: secured, summary: "Signed-in user, current session and farm memberships", responses: { 200: json(S.MeResponse, "Current user"), 401: errors[401] } });
registry.registerPath({ method: "get", path: `${API_PREFIX}/me/sessions`, tags: ["Me"], security: secured, summary: "Signed-in devices", responses: { 200: json(z28.object({ items: z28.array(S.SessionView) }), "Active sessions"), 401: errors[401] } });
registry.registerPath({ method: "delete", path: `${API_PREFIX}/me/sessions`, tags: ["Me"], security: secured, summary: "Sign out every other device", responses: { 200: json(z28.object({ revoked: z28.number() }), "Revoked"), 401: errors[401] } });
registry.registerPath({ method: "delete", path: `${API_PREFIX}/me/sessions/{sessionId}`, tags: ["Me"], security: secured, summary: "Sign out one device", request: { params: z28.object({ sessionId: Id }) }, responses: { 204: { description: "Revoked" }, 401: errors[401], 404: errors[404] } });
var memberParams = z28.object({ farmId: Id, memberId: Id });
registry.registerPath({ method: "get", path: `${API_PREFIX}/farms`, tags: ["Farms"], security: secured, responses: { 200: json(z28.object({ items: z28.array(S.FarmView) }), "Farms I belong to"), 401: errors[401] } });
registry.registerPath({ method: "post", path: `${API_PREFIX}/farms`, tags: ["Farms"], security: secured, request: { headers: idempotencyHeader, ...bodyOf(S.CreateFarmRequest) }, responses: { 201: json(S.FarmView, "Farm created; you are its owner"), 400: errors[400], 401: errors[401] } });
registry.registerPath({ method: "get", path: `${API_PREFIX}/farms/{farmId}`, tags: ["Farms"], security: secured, request: { params: farmParams2 }, responses: { 200: json(S.FarmView, "Farm with your role and permissions"), 401: errors[401], 404: errors[404] } });
registry.registerPath({ method: "put", path: `${API_PREFIX}/farms/{farmId}`, tags: ["Farms"], security: secured, summary: "Replace editable farm fields (optimistic concurrency via version)", request: { params: farmParams2, headers: idempotencyHeader, ...bodyOf(S.ReplaceFarmRequest) }, responses: { 200: json(S.FarmView, "Updated"), ...errors, 409: json(S.ErrorEnvelope, "Version conflict") } });
registry.registerPath({ method: "get", path: `${API_PREFIX}/farms/{farmId}/members`, tags: ["Members"], security: secured, request: { params: farmParams2 }, responses: { 200: json(z28.object({ items: z28.array(S.MembershipView) }), "Members and pending invitations"), ...errors } });
registry.registerPath({ method: "post", path: `${API_PREFIX}/farms/{farmId}/members`, tags: ["Members"], security: secured, summary: "Invite someone by email with a role below your own", request: { params: farmParams2, headers: idempotencyHeader, ...bodyOf(S.AddMemberRequest) }, responses: { 201: json(S.MembershipView, "Invitation sent"), ...errors, 409: json(S.ErrorEnvelope, "Already a member") } });
registry.registerPath({ method: "put", path: `${API_PREFIX}/farms/{farmId}/members/{memberId}`, tags: ["Members"], security: secured, summary: "Change a member's role", request: { params: memberParams, ...bodyOf(S.UpdateMemberRequest) }, responses: { 200: json(S.MembershipView, "Role changed"), ...errors, 422: json(S.ErrorEnvelope, "Would leave the farm without an owner") } });
registry.registerPath({ method: "delete", path: `${API_PREFIX}/farms/{farmId}/members/{memberId}`, tags: ["Members"], security: secured, summary: "Remove a member, cancel an invitation, or leave the farm (your own id)", request: { params: memberParams }, responses: { 204: { description: "Removed" }, ...errors, 422: json(S.ErrorEnvelope, "Would leave the farm without an owner") } });
post("/farms/invitations/accept", "Accept an emailed farm invitation", bodyOf(S.AcceptInviteRequest), { 200: json(S.MembershipView, "Joined"), 401: errors[401], 422: json(S.ErrorEnvelope, "Invalid or expired invitation") }, true);
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const houseParams = z28.object({ farmId: Id, houseId: Id });
  const flockParams = z28.object({ farmId: Id, flockId: Id });
  const route = (method, path, tag, summary, params, request, ok) => registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const items = (t) => z28.object({ items: z28.array(t) });
  route("get", "/houses", "Houses", "Houses of the farm", farmParams2, {}, { 200: json(items(S.HouseView), "Houses") });
  route("post", "/houses", "Houses", "Create a house", farmParams2, bodyOf(S.CreateHouseRequest), { 201: json(S.HouseView, "Created") });
  route("get", "/houses/{houseId}", "Houses", "One house", houseParams, {}, { 200: json(S.HouseView, "House") });
  route("put", "/houses/{houseId}", "Houses", "Replace a house (capacity cannot drop below birds housed)", houseParams, bodyOf(S.ReplaceHouseRequest), { 200: json(S.HouseView, "Updated") });
  route("delete", "/houses/{houseId}", "Houses", "Delete a house with no planned or active flocks", houseParams, {}, { 204: { description: "Deleted" } });
  route("get", "/flocks", "Flocks", "Flocks, filtered by status, house or type", farmParams2, { query: FlockListQuery }, { 200: json(items(S.FlockView), "Flocks") });
  route("post", "/flocks", "Flocks", "Create a flock; with placement it starts active", farmParams2, bodyOf(S.CreateFlockRequest), { 201: json(S.FlockView, "Created") });
  route("get", "/flocks/{flockId}", "Flocks", "A flock with all calculations", flockParams, { query: MetricsQuery }, { 200: json(S.FlockView, "Flock") });
  route("put", "/flocks/{flockId}", "Flocks", "Replace descriptive fields", flockParams, bodyOf(S.ReplaceFlockRequest), { 200: json(S.FlockView, "Updated") });
  route("delete", "/flocks/{flockId}", "Flocks", "Delete a planned flock with no records", flockParams, {}, { 204: { description: "Deleted" } });
  route("get", "/flocks/{flockId}/metrics", "Flocks", "Calculations as of a date, optionally valuing live birds at a reference price", flockParams, { query: MetricsQuery }, { 200: json(S.FlockMetricsView, "Metrics") });
  route("get", "/flocks/{flockId}/events", "Flock events", "The flock ledger", flockParams, {}, { 200: json(items(S.FlockEventView), "Events") });
  const commands = [
    ["placement", "Place birds in a planned flock", PlaceFlockRequest, S.FlockView],
    ["mortality", "Record deaths", MortalityRequest, S.FlockEventView],
    ["culls", "Record culled birds", CullRequest, S.FlockEventView],
    ["transfers", "Move the flock to another house, or move birds into another flock", TransferRequest, z28.object({ flock: S.FlockView, destination: S.FlockView.optional() })],
    ["splits", "Move birds into a new flock", SplitRequest, z28.object({ flock: S.FlockView, newFlock: S.FlockView })],
    ["merge", "Move every bird into another flock and close this one", MergeRequest, z28.object({ flock: S.FlockView, target: S.FlockView })],
    ["sales", "Sell birds (never more than are available)", SaleRequest, S.FlockEventView],
    ["adjustments", "Correct the bird count, with a reason", AdjustmentRequest, S.FlockEventView],
    ["weighings", "Record a weighing", WeighingRequest, S.FlockEventView]
  ];
  for (const [path, summary, body, out] of commands) {
    route("post", `/flocks/{flockId}/${path}`, "Flock events", summary, flockParams, bodyOf(body), { 201: json(out, "Recorded"), 422: json(S.ErrorEnvelope, "Not enough birds, wrong status, or over capacity") });
  }
  route("post", "/flocks/{flockId}/close", "Flocks", "Close a flock once every bird is accounted for", flockParams, bodyOf(CloseFlockRequest), { 200: json(S.FlockView, "Closed") });
  route("post", "/flocks/{flockId}/events/{eventId}/reverse", "Flock events", "Reverse a wrong placement, death, cull, adjustment, sale or weighing", z28.object({ farmId: Id, flockId: Id, eventId: Id }), bodyOf(ReverseEventRequest), { 201: json(S.FlockEventView, "Reversal recorded") });
  route("get", "/flocks/{flockId}/daily-records", "Daily records", "This flock's daily records, newest first (cursor pagination)", flockParams, { query: DateRangeQuery }, { 200: json(z28.object({ items: z28.array(S.DailyRecordListItem), nextCursor: z28.string().nullable() }), "Records") });
  route("get", "/flocks/{flockId}/daily-records/{date}", "Daily records", "Everything recorded for one day", z28.object({ farmId: Id, flockId: Id, date: LocalDate }), {}, { 200: json(S.DailyRecordView, "Day") });
  route("put", "/flocks/{flockId}/daily-records/{date}", "Daily records", "Create or replace the day's record (deaths, culls, feed, water, conditions)", z28.object({ farmId: Id, flockId: Id, date: LocalDate }), bodyOf(S.UpsertDailyRecordRequest), { 200: json(S.DailyRecordView, "Saved (or DailyRecordMinimal with Prefer: return=minimal)"), 409: json(S.ErrorEnvelope, "Changed by someone else") });
  const prefer = z28.object({ prefer: z28.string().optional().openapi({ description: "return=minimal \u2192 respond with id, version and summary only" }) });
  route("post", "/daily-records", "Daily records", "Record one flock's day: deaths, culls, feed, water, conditions, eggs, weight, observations, photos", farmParams2, { headers: prefer, ...bodyOf(S.CreateDailyRecordRequest) }, { 201: json(S.DailyRecordView, "Created (or DailyRecordMinimal)"), 409: json(S.ErrorEnvelope, "A record already exists for that flock and date (details.existingId)") });
  route("get", "/daily-records", "Daily records", "Compact list, newest first; filter by date or from/to, house, flock, type", farmParams2, { query: DailyRecordListQuery }, { 200: json(z28.object({ items: z28.array(S.DailyRecordListItem), nextCursor: z28.string().nullable() }), "Records") });
  route("get", "/daily-records/sheet", "Daily records", "Entry sheet for a day: active flocks, expected birds, today's and yesterday's records", farmParams2, { query: z28.object({ date: LocalDate.optional() }) }, { 200: json(S.DailyEntrySheet, "Sheet") });
  route("get", "/dashboard/day", "Dashboard", "One day across the farm, per flock and in total", farmParams2, { query: DashboardDayQuery }, { 200: json(S.DashboardDayView, "Day") });
  route("get", "/dashboard/trends", "Dashboard", "Daily totals over a range (max 366 days)", farmParams2, { query: TrendsQuery }, { 200: json(S.TrendsView, "Series") });
  route("post", "/media", "Media", "Upload a photo (raw JPEG, PNG or WebP body, max 5 MB)", farmParams2, { body: { content: { "image/jpeg": { schema: z28.string().openapi({ format: "binary" }) }, "image/png": { schema: z28.string().openapi({ format: "binary" }) }, "image/webp": { schema: z28.string().openapi({ format: "binary" }) } } } }, { 201: json(S.MediaAssetView, "Stored") });
  route("get", "/media/{assetId}", "Media", "Download a photo of this farm", z28.object({ farmId: Id, assetId: Id }), {}, { 200: { description: "Image bytes" } });
}
{
  const idParams = z28.object({ id: Id });
  const prefer = z28.object({ prefer: z28.string().optional() });
  registry.registerPath({ method: "get", path: `${API_PREFIX}/daily-records/{id}`, tags: ["Daily records"], summary: "One daily record with every section", security: secured, request: { params: idParams }, responses: { 200: json(S.DailyRecordView, "Record"), ...errors } });
  registry.registerPath({ method: "put", path: `${API_PREFIX}/daily-records/{id}`, tags: ["Daily records"], summary: "Replace every section (version required)", security: secured, request: { params: idParams, headers: prefer, ...bodyOf(S.UpdateDailyRecordRequest) }, responses: { 200: json(S.DailyRecordView, "Saved (or DailyRecordMinimal)"), ...errors, 409: json(S.ErrorEnvelope, "Changed by someone else") } });
  registry.registerPath({ method: "delete", path: `${API_PREFIX}/daily-records/{id}`, tags: ["Daily records"], summary: "Delete a record and undo everything it wrote", security: secured, request: { params: idParams }, responses: { 204: { description: "Deleted" }, ...errors } });
}
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const itemParams = z28.object({ farmId: Id, itemId: Id });
  const any = z28.record(z28.unknown());
  const r = (method, path, tag, summary, params, request, ok) => registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const items = z28.object({ items: z28.array(any) });
  r("get", "/inventory/overview", "Inventory", "All stock: catalog categories, eggs by grade, chick lots", farmParams2, {}, { 200: json(any, "Overview") });
  r("get", "/inventory/items", "Inventory", "Catalog with stock, low-stock and expiry status", farmParams2, { query: InventoryListQuery }, { 200: json(items, "Items") });
  r("post", "/inventory/items", "Inventory", "Add an item: feed, medicine, vaccine, disinfectant, litter, packaging, equipment, spare part, cleaning, other", farmParams2, bodyOf(CreateInventoryItemRequest), { 201: json(any, "Created") });
  r("get", "/inventory/items/{itemId}", "Inventory", "An item with its open lots", itemParams, {}, { 200: json(any, "Item") });
  r("put", "/inventory/items/{itemId}", "Inventory", "Replace item details and alert thresholds", itemParams, bodyOf(UpdateInventoryItemRequest), { 200: json(any, "Updated") });
  r("post", "/inventory/items/{itemId}/purchases", "Inventory", "Receive a purchase as a lot (supplier, batch, expiry, location, unit cost)", itemParams, bodyOf(PurchaseRequest), { 201: json(any, "Lot") });
  r("post", "/inventory/items/{itemId}/issues", "Inventory", "Use stock (FEFO; expired stock is never used)", itemParams, bodyOf(IssueRequest), { 201: json(any, "Issued"), 422: json(S.ErrorEnvelope, "Not enough in-date stock") });
  r("post", "/inventory/items/{itemId}/wastage", "Inventory", "Write off lost, spoiled or expired stock (expired first)", itemParams, bodyOf(WastageRequest), { 201: json(any, "Recorded") });
  r("post", "/inventory/items/{itemId}/counts", "Inventory", "Stock count: correct the book quantity", itemParams, bodyOf(StockCountRequest), { 201: json(any, "Counted") });
  r("get", "/inventory/items/{itemId}/transactions", "Inventory", "The item's stock ledger", itemParams, { query: TransactionsQuery }, { 200: json(items, "Movements") });
  r("get", "/inventory/lots", "Inventory", "Lots in stock, optionally only expired or expiring", farmParams2, { query: LotsQuery }, { 200: json(items, "Lots") });
  r("get", "/inventory/eggs", "Inventory", "Egg stock by grade", farmParams2, {}, { 200: json(any, "Eggs") });
  r("post", "/inventory/eggs/movements", "Inventory", "Eggs used, spoiled or counted", farmParams2, bodyOf(EggMovementRequest), { 201: json(any, "Recorded") });
  r("get", "/inventory/chick-lots", "Inventory", "Chick lots", farmParams2, { query: ChickLotsQuery }, { 200: json(items, "Lots") });
  r("post", "/inventory/chick-lots", "Inventory", "Receive day-old chicks", farmParams2, bodyOf(ReceiveChicksRequest), { 201: json(any, "Lot") });
  r("post", "/feed/consumption", "Feed", "Feed eaten by a flock, or wasted; moves stock and costs it from lots", farmParams2, bodyOf(FeedConsumptionRequest), { 201: json(any, "Recorded"), 422: json(S.ErrorEnvelope, "Not enough in-date feed") });
  r("get", "/feed/consumption", "Feed", "Feed entries", farmParams2, { query: FeedListQuery }, { 200: json(items, "Entries") });
  r("delete", "/feed/consumption/{id}", "Feed", "Remove a feed entry and return its stock", z28.object({ farmId: Id, id: Id }), {}, { 204: { description: "Removed" } });
  r("get", "/feed/stock", "Feed", "Feed stock with average daily use and days of feed remaining", farmParams2, {}, { 200: json(any, "Stock") });
  r("get", "/feed/analytics", "Feed", "Per flock: feed per bird, per kg gain, FCR, wastage, feed cost per bird and per egg", farmParams2, { query: FeedAnalyticsQuery }, { 200: json(any, "Analytics") });
  r("get", "/water-records", "Water", "Water records with source, quality, treatment and abnormal flags", farmParams2, { query: WaterListQuery }, { 200: json(items, "Records") });
  r("get", "/alerts", "Alerts", "Alerts filtered by status, type, rule, severity or flock, with counts of what is open", farmParams2, { query: AlertsQuery }, { 200: json(z28.object({ items: z28.array(z28.record(z28.unknown())), counts: z28.record(z28.unknown()) }), "Alerts and counts") });
  r("post", "/alerts/evaluate", "Alerts", "Re-check stock and expiry alerts now", farmParams2, {}, { 200: json(any, "Done") });
  r("post", "/alerts/{alertId}/acknowledge", "Alerts", "Acknowledge an alert", z28.object({ farmId: Id, alertId: Id }), {}, { 200: json(any, "Acknowledged") });
}
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const any = z28.record(z28.unknown());
  const items = z28.object({ items: z28.array(any) });
  const idp = z28.object({ farmId: Id, id: Id });
  const r = (method, path, tag, summary, params, request, ok) => registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const H = "FlockHealth";
  r("get", "/health/medicines", H, "The farm's medicine and vaccine catalog with withdrawal periods (from label or vet)", farmParams2, {}, { 200: json(items, "Medicines") });
  r("post", "/health/medicines", H, "Add a medicine", farmParams2, bodyOf(CreateMedicineRequest), { 201: json(any, "Created") });
  r("put", "/health/medicines/{id}", H, "Replace a medicine", idp, bodyOf(UpdateMedicineRequest), { 200: json(any, "Updated") });
  r("get", "/health/records", H, "Health records: observations, vet visits, treatments, lab tests, post-mortems", farmParams2, { query: HealthRecordListQuery }, { 200: json(items, "Records") });
  r("post", "/health/records", H, "Record an observation, visit, treatment, lab test or post-mortem (assessments are attributed; nothing is diagnosed)", farmParams2, bodyOf(CreateHealthRecordRequest), { 201: json(any, "Created") });
  r("get", "/health/records/{id}", H, "One health record with attachment links", idp, {}, { 200: json(any, "Record") });
  r("put", "/health/records/{id}", H, "Replace a health record", idp, bodyOf(UpdateHealthRecordRequest), { 200: json(any, "Updated") });
  r("delete", "/health/records/{id}", H, "Delete a record; its medicine returns to stock and its withdrawal periods lift", idp, {}, { 204: { description: "Deleted" } });
  r("post", "/health/records/{id}/follow-up-done", H, "Mark the follow-up done", idp, {}, { 200: json(any, "Updated") });
  r("get", "/health/reminders", H, "Vaccinations due or overdue, follow-ups, withdrawal end dates", farmParams2, { query: RemindersQuery }, { 200: json(any, "Reminders") });
  r("get", "/health/withdrawals/{flockId}", H, "Withdrawal periods in force for a flock", z28.object({ farmId: Id, flockId: Id }), {}, { 200: json(any, "Withdrawals") });
  r("get", "/health/programmes", H, "The farm's vaccination programmes", farmParams2, {}, { 200: json(items, "Programmes") });
  r("post", "/health/programmes", H, "Add a vaccination programme (from the farm's vet or hatchery)", farmParams2, bodyOf(CreateProgrammeRequest), { 201: json(any, "Created") });
  r("post", "/health/programmes/apply/{flockId}", H, "Schedule a programme for a flock by bird age", z28.object({ farmId: Id, flockId: Id }), bodyOf(ApplyProgrammeRequest), { 201: json(any, "Scheduled") });
  r("get", "/health/vaccinations", H, "Vaccinations with derived state (scheduled, due, overdue, done, skipped)", farmParams2, { query: VaccinationListQuery }, { 200: json(items, "Vaccinations") });
  r("post", "/health/vaccinations", H, "Schedule a vaccination", farmParams2, bodyOf(ScheduleVaccinationRequest), { 201: json(any, "Scheduled") });
  r("post", "/health/vaccinations/{id}/administer", H, "Record a vaccination as given (batches and expiry from stock; expired batches refused)", idp, bodyOf(AdministerVaccinationRequest), { 200: json(any, "Given") });
  r("post", "/health/vaccinations/{id}/skip", H, "Skip a vaccination with a reason", idp, bodyOf(SkipVaccinationRequest), { 200: json(any, "Skipped") });
  const B = "BioSecure Farm";
  r("get", "/biosecurity/summary", B, "Biosecurity at a glance", farmParams2, {}, { 200: json(any, "Summary") });
  r("get", "/biosecurity/checklists", B, "The farm's checklists", farmParams2, { query: ChecklistTemplateQuery }, { 200: json(items, "Checklists") });
  r("post", "/biosecurity/checklists", B, "Add a checklist", farmParams2, bodyOf(CreateChecklistTemplateRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/checklists/starter", B, "Add generic starter checklists (editable; no country rules)", farmParams2, {}, { 201: json(any, "Added") });
  r("put", "/biosecurity/checklists/{id}", B, "Replace a checklist (bumps its version)", idp, bodyOf(UpdateChecklistTemplateRequest), { 200: json(any, "Updated") });
  r("get", "/biosecurity/visitors", B, "Visitor register", farmParams2, { query: VisitorListQuery }, { 200: json(items, "Visitors") });
  r("post", "/biosecurity/visitors", B, "Check a visitor in (declaration, previous poultry contact, PPE, footbath)", farmParams2, bodyOf(VisitorCheckInRequest), { 201: json(any, "Checked in"), 422: json(S.ErrorEnvelope, "Declaration incomplete") });
  r("post", "/biosecurity/visitors/{id}/check-out", B, "Check a visitor out", idp, bodyOf(VisitorCheckOutRequest), { 200: json(any, "Checked out") });
  r("get", "/biosecurity/logs", B, "Biosecurity logs", farmParams2, { query: BiosecurityLogQuery }, { 200: json(items, "Logs") });
  r("post", "/biosecurity/logs", B, "Record cleaning, disinfection, footbath, vehicle, pest control, wild bird observation or audit", farmParams2, bodyOf(BiosecurityLogRequest), { 201: json(any, "Recorded") });
  r("get", "/biosecurity/equipment", B, "Equipment", farmParams2, {}, { 200: json(items, "Equipment") });
  r("post", "/biosecurity/equipment", B, "Add equipment", farmParams2, bodyOf(EquipmentRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/equipment/{id}/moves", B, "Record an equipment movement", idp, bodyOf(EquipmentMoveRequest), { 201: json(any, "Moved") });
  r("get", "/biosecurity/cleaning-schedules", B, "Cleaning and disinfection schedules", farmParams2, {}, { 200: json(items, "Schedules") });
  r("post", "/biosecurity/cleaning-schedules", B, "Add a schedule", farmParams2, bodyOf(CleaningScheduleRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/cleaning-schedules/{id}/complete", B, "Complete a scheduled cleaning (writes the log, moves the next due date)", idp, bodyOf(CompleteCleaningRequest), { 201: json(any, "Completed") });
  r("get", "/biosecurity/corrective-actions", B, "Corrective actions", farmParams2, { query: ActionListQuery }, { 200: json(items, "Actions") });
  r("post", "/biosecurity/corrective-actions", B, "Raise a corrective action", farmParams2, bodyOf(CorrectiveActionRequest), { 201: json(any, "Created") });
  r("post", "/biosecurity/corrective-actions/{id}/complete", B, "Complete an action", idp, bodyOf(CompleteActionRequest), { 200: json(any, "Completed") });
  r("post", "/biosecurity/corrective-actions/{id}/verify", B, "Verify an action (not by the person who completed it)", idp, {}, { 200: json(any, "Verified") });
  r("get", "/content/articles", "Content", "Published educational articles (global and the farm's country), each with sources", farmParams2, { query: ArticleListQuery }, { 200: json(items, "Articles") });
  r("get", "/content/articles/{slug}", "Content", "One published article with content, references and attribution", z28.object({ farmId: Id, slug: z28.string() }), {}, { 200: json(any, "Article") });
}
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const any = z28.record(z28.unknown());
  const items = z28.object({ items: z28.array(any) });
  const idp = z28.object({ farmId: Id, id: Id });
  const r = (method, path, tag, summary, params, request, ok) => registry.registerPath({ method, path: `${P}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const H = "HatcheryHub";
  r("get", "/hatchery/summary", H, "Performance over completed batches: fertility, hatchability, saleable and loss %", farmParams2, { query: HatcherySummaryQuery }, { 200: json(any, "Summary") });
  r("get", "/hatchery/batches", H, "Batches with counts and rates", farmParams2, { query: BatchListQuery }, { 200: json(items, "Batches") });
  r("post", "/hatchery/batches", H, "Egg source, selection and setting (own-flock eggs drawn from stock)", farmParams2, bodyOf(CreateHatcheryBatchRequest), { 201: json(any, "Set") });
  r("get", "/hatchery/batches/{id}", H, "A batch with its timeline", idp, {}, { 200: json(any, "Batch") });
  r("post", "/hatchery/batches/{id}/candling", H, "Candling: infertile, dead embryo, cracked", idp, bodyOf(CandlingRequest), { 201: json(any, "Recorded") });
  r("post", "/hatchery/batches/{id}/transfer", H, "Transfer to the hatcher", idp, bodyOf(TransferToHatcherRequest), { 201: json(any, "Recorded") });
  r("post", "/hatchery/batches/{id}/hatch", H, "Hatch: hatched and dead in shell (must account for every egg)", idp, bodyOf(HatchRequest), { 201: json(any, "Recorded") });
  r("post", "/hatchery/batches/{id}/grading", H, "Chick grading: saleable and culled; creates the chick lot", idp, bodyOf(GradingRequest), { 201: json(any, "Graded") });
  r("post", "/hatchery/batches/{id}/readings", H, "Setter or hatcher temperature and humidity", idp, bodyOf(MachineReadingRequest), { 201: json(any, "Recorded") });
  r("post", "/hatchery/batches/{id}/reverse", H, "Undo the latest stage", idp, bodyOf(ReasonRequest), { 201: json(any, "Reversed") });
  r("post", "/hatchery/batches/{id}/cancel", H, "Cancel a batch before it hatches", idp, bodyOf(ReasonRequest), { 200: json(any, "Cancelled") });
  r("get", "/buyers", "Orders", "Buyers", farmParams2, {}, { 200: json(items, "Buyers") });
  r("post", "/buyers", "Orders", "Add a buyer", farmParams2, bodyOf(BuyerRequest), { 201: json(any, "Created") });
  r("get", "/chick-orders", "Orders", "Chick orders", farmParams2, { query: OrderListQuery }, { 200: json(items, "Orders") });
  r("post", "/chick-orders", "Orders", "Order chicks from a lot, or book against a batch still incubating", farmParams2, bodyOf(ChickOrderRequest), { 201: json(any, "Created"), 422: json(S.ErrorEnvelope, "Not enough free chicks") });
  r("post", "/chick-orders/{id}/confirm", "Orders", "Confirm an order", idp, {}, { 200: json(any, "Confirmed") });
  r("post", "/chick-orders/{id}/cancel", "Orders", "Cancel an order", idp, bodyOf(ReasonRequest), { 200: json(any, "Cancelled") });
  r("post", "/chick-orders/{id}/deliver", "Orders", "Deliver: draws the chicks from the lot", idp, bodyOf(DeliverOrderRequest), { 200: json(any, "Delivered") });
  const C = "ChickStart";
  r("get", "/chickstart/profiles", C, "Brooding profiles (the farm's own targets by day of age)", farmParams2, {}, { 200: json(items, "Profiles") });
  r("post", "/chickstart/profiles", C, "Add a brooding profile", farmParams2, bodyOf(BroodingProfileRequest), { 201: json(any, "Created") });
  r("get", "/chickstart/arrivals", C, "Planned and past chick arrivals", farmParams2, { query: ArrivalListQuery }, { 200: json(items, "Arrivals") });
  r("post", "/chickstart/arrivals", C, "Plan a chick arrival", farmParams2, bodyOf(PlanArrivalRequest), { 201: json(any, "Planned") });
  r("post", "/chickstart/arrivals/{id}/preparation", C, "House and arrival preparation checklist", idp, bodyOf(PreparationRequest), { 200: json(any, "Prepared") });
  r("post", "/chickstart/arrivals/{id}/arrive", C, "Record the arrival and place the chicks into a new flock", idp, bodyOf(ArriveRequest), { 201: json(any, "Arrived") });
  r("post", "/chickstart/arrivals/{id}/cancel", C, "Cancel a planned arrival", idp, bodyOf(ReasonRequest), { 200: json(any, "Cancelled") });
  r("post", "/chickstart/checks", C, "Brooder check, judged against the farm's profile", farmParams2, bodyOf(BrooderCheckRequest), { 201: json(any, "Recorded") });
  r("get", "/chickstart/flocks/{flockId}", C, "The brooding period day by day", z28.object({ farmId: Id, flockId: Id }), { query: BroodingViewQuery }, { 200: json(any, "Brooding view") });
  r("get", "/calendar", "Calendar", "Expected transfers and hatches, chick deliveries and arrivals, vaccinations, cleaning, follow-ups", farmParams2, { query: CalendarQuery }, { 200: json(any, "Events") });
  r("get", "/calendar/ics", "Calendar", "The same events as an iCalendar file", farmParams2, { query: CalendarQuery }, { 200: { description: "text/calendar" } });
}
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const any = z28.record(z28.unknown());
  const items = z28.object({ items: z28.array(any) });
  const idp = z28.object({ farmId: Id, id: Id });
  const r = (method, path, tag, summary, params, request, ok, prefix = P) => registry.registerPath({ method, path: `${prefix}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const F = "Finance";
  r("get", "/finance/suppliers", F, "Suppliers", farmParams2, {}, { 200: json(items, "Suppliers") });
  r("post", "/finance/suppliers", F, "Add a supplier", farmParams2, bodyOf(SupplierRequest), { 201: json(any, "Created") });
  r("get", "/finance/suppliers/{id}", F, "Supplier statement: bills and what is owed", idp, {}, { 200: json(any, "Statement") });
  r("get", "/finance/accounts", F, "Money accounts with balances", farmParams2, {}, { 200: json(items, "Accounts") });
  r("post", "/finance/accounts", F, "Add a cash, bank or mobile money account", farmParams2, bodyOf(MoneyAccountRequest), { 201: json(any, "Created") });
  r("post", "/finance/transfers", F, "Move money between the farm's accounts", farmParams2, bodyOf(TransferRequestMoney), { 201: json(any, "Transferred"), 422: json(S.ErrorEnvelope, "Not enough in a cash or mobile money account") });
  r("get", "/finance/ledger", F, "Cash ledger entries", farmParams2, { query: LedgerQuery }, { 200: json(items, "Entries") });
  for (const [path, label, body] of [["expenses", "bill (expense or purchase)", ExpenseRequest], ["incomes", "income (sale or other)", IncomeRequest]]) {
    r("get", `/finance/${path}`, F, `List ${path}`, farmParams2, { query: DocumentListQuery }, { 200: json(items, path) });
    r("post", `/finance/${path}`, F, `Record a ${label}; optionally paid now`, farmParams2, bodyOf(body), { 201: json(any, "Created") });
    r("get", `/finance/${path}/{id}`, F, `One ${label} with its payments`, idp, {}, { 200: json(any, "Document") });
    r("post", `/finance/${path}/{id}/payments`, F, "Record a payment (no overpayment)", idp, bodyOf(PaymentRequest), { 201: json(any, "Paid") });
    r("post", `/finance/${path}/{id}/refunds`, F, "Record a refund (not more than was paid)", idp, bodyOf(RefundRequest), { 201: json(any, "Refunded") });
    r("post", `/finance/${path}/{id}/cancel`, F, "Cancel an unpaid, hand-entered document", idp, bodyOf(ReasonRequest), { 200: json(any, "Cancelled") });
  }
  r("get", "/finance/recurring", F, "Recurring expenses", farmParams2, {}, { 200: json(items, "Recurring") });
  r("post", "/finance/recurring", F, "Add a recurring expense", farmParams2, bodyOf(RecurringExpenseRequest), { 201: json(any, "Created") });
  r("post", "/finance/recurring/generate", F, "Create bills that have fallen due (idempotent; also hourly)", farmParams2, {}, { 200: json(any, "Created") });
  r("post", "/finance/recurring/{id}/pause", F, "Pause a recurring expense", idp, bodyOf(PauseRequest), { 200: json(any, "Paused") });
  r("get", "/finance/reports/pnl", F, "Profit and loss (accrual, excluding tax)", farmParams2, { query: PeriodQuery }, { 200: json(any, "P&L") });
  r("get", "/finance/reports/cash-flow", F, "Cash flow by category and account", farmParams2, { query: PeriodQuery }, { 200: json(any, "Cash flow") });
  r("get", "/finance/reports/expenses", F, "Expense breakdown by category, supplier, flock and house", farmParams2, { query: PeriodQuery }, { 200: json(any, "Breakdown") });
  r("get", "/finance/reports/revenue", F, "Revenue breakdown by category, customer, flock and source", farmParams2, { query: PeriodQuery }, { 200: json(any, "Breakdown") });
  r("get", "/finance/reports/receivables", F, "Receivables, aged", farmParams2, {}, { 200: json(any, "Receivables") });
  r("get", "/finance/reports/payables", F, "Payables, aged", farmParams2, {}, { 200: json(any, "Payables") });
  r("get", "/finance/reports/flock-profitability", F, "Flock profitability with cost per bird, per kg and per egg", farmParams2, { query: ProfitabilityQuery }, { 200: json(any, "Profitability") });
  r("get", "/finance/reports/house-costing", F, "Costs and revenue by house", farmParams2, { query: OptionalPeriodQuery }, { 200: json(any, "Costing") });
  const M = "PoultryMarket";
  r("get", "/market/listings", M, "Your listings", farmParams2, { query: MyListingsQuery }, { 200: json(items, "Listings") });
  r("post", "/market/listings", M, "Create a listing (draft)", farmParams2, bodyOf(ListingRequest), { 201: json(any, "Created") });
  r("put", "/market/listings/{id}", M, "Replace a listing", idp, bodyOf(UpdateListingRequest), { 200: json(any, "Updated") });
  r("post", "/market/listings/{id}/status", M, "Activate, pause or close a listing", idp, bodyOf(ListingStatusRequest), { 200: json(any, "Updated") });
  r("get", "/market/orders", M, "Orders you received", farmParams2, { query: OrderListQueryMarket }, { 200: json(items, "Orders") });
  r("get", "/market/orders/{id}", M, "An order with its payments", idp, {}, { 200: json(any, "Order") });
  for (const [path, summary, body] of [["accept", "PENDING \u2192 ACCEPTED (reserves quantity, creates the receivable)", null], ["prepare", "ACCEPTED \u2192 PREPARING", null], ["dispatch", "\u2192 DISPATCHED (not for pickup)", DispatchRequest], ["deliver", "\u2192 DELIVERED (moves stock)", DeliveredRequest], ["complete", "DELIVERED \u2192 COMPLETED (fully paid only)", null], ["cancel", "\u2192 CANCELLED before dispatch (restores quantity; refund payments first)", ReasonRequest]]) {
    r("post", `/market/orders/{id}/${path}`, M, summary, idp, body ? bodyOf(body) : {}, { 200: json(any, "Order"), 422: json(S.ErrorEnvelope, "Transition not allowed") });
  }
  r("post", "/market/orders/{id}/payments", M, "Record a payment received", idp, bodyOf(PaymentRequest), { 201: json(any, "Recorded") });
  r("post", "/market/orders/{id}/refunds", M, "Record a refund", idp, bodyOf(RefundRequest), { 201: json(any, "Recorded") });
  r("get", "/buyers/{id}", "Orders", "A buyer's orders and what they owe", idp, {}, { 200: json(any, "Buyer") });
  r("put", "/buyers/{id}", "Orders", "Replace a buyer", idp, bodyOf(BuyerUpdateRequest), { 200: json(any, "Updated") });
  const B = `${API_PREFIX}/market`;
  const oid = z28.object({ id: Id });
  r("get", "/listings", M, "Browse active listings (any signed-in user; no seller contact)", z28.object({}), { query: BrowseQuery }, { 200: json(items, "Listings") }, B);
  r("get", "/listings/{id}", M, "One active listing", oid, {}, { 200: json(any, "Listing") }, B);
  r("post", "/orders", M, "Place an order (price from the listing)", z28.object({}), bodyOf(PlaceOrderRequest), { 201: json(any, "Placed") }, B);
  r("get", "/orders", M, "Your purchases across sellers", z28.object({}), {}, { 200: json(items, "Orders") }, B);
  r("get", "/orders/{id}", M, "One of your purchases (seller contact once accepted)", oid, {}, { 200: json(any, "Order") }, B);
  r("post", "/orders/{id}/cancel", M, "Cancel while pending or accepted", oid, bodyOf(ReasonRequest), { 200: json(any, "Cancelled") }, B);
  r("post", "/orders/{id}/received", M, "Confirm a dispatched order arrived", oid, {}, { 200: json(any, "Delivered") }, B);
  r("post", "/orders/{id}/complete", M, "Complete a delivered, paid order", oid, {}, { 200: json(any, "Completed") }, B);
}
{
  const P = `${API_PREFIX}/farms/{farmId}`;
  const any = z28.record(z28.unknown());
  const items = z28.object({ items: z28.array(any) });
  const r = (method, path, tag, summary, params, request, ok, prefix = P) => registry.registerPath({ method, path: `${prefix}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const I = "Intelligence";
  const ruleParams = z28.object({ farmId: Id, ruleKey: RuleKey });
  r("get", "/dashboard", I, "Home screen in one call: production today, alerts, weather, the coming week, stock, hatchery, money (sections by permission)", farmParams2, {}, { 200: json(any, "Dashboard") });
  r("get", "/analytics", I, "Daily series with baseline bands and anomalies; flocks against the farm's past flocks; alert counts", farmParams2, { query: AnalyticsQuery }, { 200: json(any, "Analytics") });
  r("get", "/alert-rules", I, "All 14 rules with the farm's settings, parameters, ranges and defaults", farmParams2, {}, { 200: json(items, "Rules") });
  r("put", "/alert-rules/{ruleKey}", I, "Set a rule: on/off, parameters, severity, channels, roles, cooldown, scope", ruleParams, bodyOf(AlertRuleUpdateRequest), { 200: json(any, "Rule") });
  r("delete", "/alert-rules/{ruleKey}", I, "Back to catalog defaults", ruleParams, {}, { 200: json(any, "Rule") });
  r("get", "/weather", I, "Current weather, 7-day forecast, history and risks for the farm (cached; through the backend only)", farmParams2, { query: WeatherQuery }, { 200: json(any, "Weather"), 503: json(S.ErrorEnvelope, "Weather unavailable and nothing cached") });
  r("get", "/health/appointments", "FlockHealth", "Vet appointments", farmParams2, { query: AppointmentListQuery }, { 200: json(items, "Appointments") });
  r("post", "/health/appointments", "FlockHealth", "Book a vet appointment (reminded by the vet appointment rule)", farmParams2, bodyOf(AppointmentRequest), { 201: json(any, "Booked") });
  r("post", "/health/appointments/{id}/complete", "FlockHealth", "Mark an appointment done", z28.object({ farmId: Id, id: Id }), bodyOf(CompleteAppointmentRequest), { 200: json(any, "Done") });
  const M = `${API_PREFIX}/me`;
  const N = "Notifications";
  r("get", "/notifications", N, "Your in-app notifications across farms, with the unread count", z28.object({}), { query: NotificationListQuery }, { 200: json(any, "Inbox") }, M);
  r("post", "/notifications/read", N, "Mark notifications read", z28.object({}), bodyOf(MarkReadRequest), { 200: json(any, "Marked") }, M);
  r("post", "/notifications/read-all", N, "Mark all read", z28.object({}), {}, { 200: json(any, "Marked") }, M);
  r("post", "/push-devices", N, "Register this device for push", z28.object({}), bodyOf(PushDeviceRequest), { 201: json(any, "Registered") }, M);
  r("delete", "/push-devices/{id}", N, "Remove a device", z28.object({ id: Id }), {}, { 204: { description: "Removed" } }, M);
  r("get", "/notification-preferences", N, "Your push and email preferences", z28.object({}), {}, { 200: json(any, "Preferences") }, M);
  r("put", "/notification-preferences", N, "Set push and email on/off, minimum severity, muted rules", z28.object({}), bodyOf(NotificationPreferencesRequest), { 200: json(any, "Preferences") }, M);
}
{
  const any = z28.record(z28.unknown());
  const items = z28.object({ items: z28.array(any) });
  const r = (method, path, tag, summary, params, request, ok) => registry.registerPath({ method, path: `${API_PREFIX}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  const none = z28.object({});
  const K = "Knowledge";
  r("get", "/content/articles", K, "Published facts, guides, news and disease information for a region", none, { query: ContentArticleQuery }, { 200: json(items, "Articles") });
  r("get", "/content/articles/{slug}", K, "One published article with content, references and attribution", SlugParams, { query: LocaleQuery }, { 200: json(any, "Article") });
  r("get", "/content/news", K, "News for a region, newest publication first", none, { query: NewsQuery }, { 200: json(items, "News") });
  r("get", "/content/facts/today", K, "Fact of the day", none, { query: FactQuery }, { 200: json(any, "Fact") });
  r("get", "/content/glossary", K, "Glossary search", none, { query: GlossaryQuery }, { 200: json(items, "Terms") });
  r("get", "/content/courses", K, "Training courses with your progress", none, { query: CourseQuery }, { 200: json(items, "Courses") });
  r("get", "/content/courses/{slug}", K, "A course with its lessons and your progress", SlugParams, { query: LocaleQuery }, { 200: json(any, "Course") });
  r("post", "/content/courses/{slug}/lessons/{lessonId}/complete", K, "Mark a lesson done", LessonParams, { query: LocaleQuery }, { 200: json(any, "Course") });
  const E = "Knowledge editorial";
  r("get", "/admin/content/articles", E, "All articles by status (content editors)", none, { query: EditorArticleQuery }, { 200: json(items, "Articles") });
  r("post", "/admin/content/articles", E, "Create a draft", none, bodyOf(ArticleRequest), { 201: json(any, "Draft") });
  r("get", "/admin/content/articles/{id}", E, "One article, any status", IdParams, {}, { 200: json(any, "Article") });
  r("put", "/admin/content/articles/{id}", E, "Replace an article (published ones: publishers only)", IdParams, bodyOf(UpdateArticleRequest), { 200: json(any, "Article") });
  r("post", "/admin/content/articles/{id}/submit", E, "Draft \u2192 in review (publishing rules checked)", IdParams, {}, { 200: json(any, "Article") });
  r("post", "/admin/content/articles/{id}/publish", E, "In review \u2192 published (publishers; health content needs a second person)", IdParams, {}, { 200: json(any, "Article") });
  r("post", "/admin/content/articles/{id}/reject", E, "Send back to draft", IdParams, bodyOf(RejectRequest), { 200: json(any, "Article") });
  r("post", "/admin/content/articles/{id}/archive", E, "Archive (hidden from readers)", IdParams, {}, { 200: json(any, "Article") });
  r("post", "/admin/content/import", E, "Import external items for review (one per source URL; teasers only)", none, bodyOf(ImportRequest), { 201: json(any, "Imported") });
  r("put", "/admin/content/glossary", E, "Create or update a glossary term", none, bodyOf(GlossaryRequest), { 200: json(any, "Term") });
  r("put", "/admin/content/courses", E, "Create or update a course and its lessons", none, bodyOf(CourseRequest), { 200: json(any, "Course") });
  const R = "Reports";
  r("get", "/farms/{farmId}/reports", R, "Reports this person may export", farmParams2, {}, { 200: json(items, "Catalog") });
  r("get", "/farms/{farmId}/reports/{type}", R, "Generate a report from live data as PDF, CSV, Excel or JSON (each report needs its own permission)", z28.object({ farmId: Id, type: ReportType }), { query: ReportQuery }, {
    200: { description: "The report file (application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet) or JSON" }
  });
}
{
  const any = z28.record(z28.unknown());
  const r = (method, path, tag, summary, params, request, ok) => registry.registerPath({ method, path: `${API_PREFIX}${path}`, tags: [tag], summary, security: secured, request: { params, ...request }, responses: { ...ok, ...errors } });
  r("patch", "/farms/{farmId}/flocks/{flockId}/daily-records/{date}", "Daily records", "Change only the sections sent (e.g. eggs) and keep the rest of the day as recorded; version required once the record exists", z28.object({ farmId: Id, flockId: Id, date: LocalDate }), bodyOf(PatchDailyRecordRequest), { 200: json(any, "The day's record"), 409: json(S.ErrorEnvelope, "Changed by someone else") });
  r("get", "/farms/{farmId}/flocks/{flockId}/weighings", "Flocks", "Weigh-ins, newest first, with min, max, CV and uniformity when birds were weighed one by one", z28.object({ farmId: Id, flockId: Id }), {}, { 200: json(z28.object({ items: z28.array(any) }), "Weigh-ins") });
  const task = z28.object({ farmId: Id, taskId: Id });
  const farmP = z28.object({ farmId: Id });
  r("get", "/farms/{farmId}/tasks", "Tasks", "Tasks, overdue first; filter by status, assignee (me = mine or unassigned), due window, flock, house", farmP, { query: TaskListQuery }, { 200: json(any, "Tasks with counts") });
  r("get", "/farms/{farmId}/tasks/today", "Tasks", "Today's work: my tasks due today or overdue, scheduled work from the calendar, flocks still needing today's entry", farmP, {}, { 200: json(any, "Today's work") });
  r("post", "/farms/{farmId}/tasks", "Tasks", "Create a task (task.manage)", farmP, bodyOf(CreateTaskRequest), { 201: json(any, "The task") });
  r("get", "/farms/{farmId}/tasks/{taskId}", "Tasks", "One task", task, {}, { 200: json(any, "The task") });
  r("put", "/farms/{farmId}/tasks/{taskId}", "Tasks", "Edit a task (version required)", task, bodyOf(UpdateTaskRequest), { 200: json(any, "The task"), 409: json(S.ErrorEnvelope, "Changed by someone else") });
  r("post", "/farms/{farmId}/tasks/{taskId}/start", "Tasks", "Start a task", task, {}, { 200: json(any, "The task") });
  r("post", "/farms/{farmId}/tasks/{taskId}/complete", "Tasks", "Finish a task (notes required for corrective actions)", task, bodyOf(CompleteTaskRequest), { 200: json(any, "The task") });
  r("post", "/farms/{farmId}/tasks/{taskId}/cancel", "Tasks", "Cancel a task (task.manage)", task, bodyOf(CancelTaskRequest), { 200: json(any, "The task") });
  r("post", "/farms/{farmId}/tasks/{taskId}/reopen", "Tasks", "Reopen a finished or cancelled task (task.manage)", task, {}, { 200: json(any, "The task") });
  r("get", "/farms/{farmId}/audit", "Farms", "The farm's audit log, newest first (audit.read)", farmP, { query: PageQuery }, { 200: json(any, "Audit entries") });
  r("post", "/farms/{farmId}/chick-orders/{id}/payments", "Hatchery", "Record a payment on a chick order (payment.record)", z28.object({ farmId: Id, id: Id }), bodyOf(PaymentRequest), { 201: json(any, "The order and payment") });
  r("put", "/me", "Account", "Update your own name and phone", z28.object({}), bodyOf(UpdateProfileRequest), { 200: json(any, "Your account") });
}
registry.registerPath({
  method: "get",
  path: `${API_PREFIX}/sync/pull`,
  tags: ["Sync"],
  security: secured,
  request: { query: SyncPullQuery },
  responses: {
    200: json(z28.object({ changes: z28.array(S.SyncChange), nextSince: z28.number(), hasMore: z28.boolean() }), "Changes after `since`"),
    ...errors
  }
});
registry.registerPath({
  method: "post",
  path: `${API_PREFIX}/sync/push`,
  tags: ["Sync"],
  security: secured,
  request: { body: { content: { "application/json": { schema: S.SyncPushRequest } } } },
  responses: { 200: json(z28.object({ results: z28.array(SyncMutationResult) }), "Per-mutation results"), ...errors }
});
function buildOpenApiDocument(opts = {}) {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "PoultryPilot API",
      version: opts.version ?? "0.1.0",
      description: "Single REST API shared by the PoultryPilot web and mobile apps."
    },
    servers: [{ url: opts.serverUrl ?? "http://localhost:4000" }]
  });
}

// src/http/routes/system.routes.ts
import { Router as Router16 } from "express";
function systemRoutes(checks, info, opts) {
  const r = Router16();
  r.get("/health", async (_req, res) => {
    const mongodb = await checks.mongodb();
    const body = {
      status: mongodb.status === "up" ? "ok" : "degraded",
      version: info.version,
      environment: info.environment,
      uptimeSeconds: Math.round((Date.now() - info.startedAt.getTime()) / 1e3),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      checks: { mongodb }
    };
    res.setHeader("Cache-Control", "no-store");
    res.status(body.status === "ok" ? 200 : 503).json(body);
  });
  r.get("/health/live", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ status: "ok" });
  });
  if (opts.openapi) {
    let doc;
    r.get("/openapi.json", (req, res) => {
      doc ??= buildOpenApiDocument({ serverUrl: `${req.protocol}://${req.get("host")}`, version: info.version });
      res.json(doc);
    });
  }
  return r;
}

// src/app.ts
var limited = (windowLimit) => rateLimit({
  windowMs: 6e4,
  limit: windowLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: { code: "RATE_LIMITED", message: "Too many requests. Wait a minute and try again.", requestId: req.requestId }
  })
});
function createApp(c) {
  const app = express2();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.set("trust proxy", c.config.trustProxy);
  app.use(requestId);
  app.use(
    pinoHttp({
      logger: c.logger,
      genReqId: (req) => req.requestId,
      customProps: (req) => ({ requestId: req.requestId }),
      autoLogging: { ignore: (req) => (req.url ?? "").startsWith(`${API_PREFIX}/health`) },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode })
      }
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: c.config.corsOrigins,
      credentials: false,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", HEADERS.idempotencyKey, HEADERS.requestId, HEADERS.deviceId],
      exposedHeaders: [HEADERS.requestId, HEADERS.idempotentReplayed, "RateLimit", "RateLimit-Policy"],
      maxAge: 600
    })
  );
  const v1 = express2.Router();
  v1.use(systemRoutes(c.health, { version: c.config.version, environment: c.config.environment, startedAt: c.startedAt }, { openapi: c.config.openapiEnabled }));
  v1.use(limited(c.config.rateLimitPerMinute));
  v1.use(express2.json({ limit: c.config.bodyLimit }));
  v1.use("/auth", authRoutes(c.auth, limited(c.config.authRateLimitPerMinute)));
  const secured2 = [authenticate(c.auth), idempotency(c.repos.idempotency)];
  const mine = myNotificationRoutes(c.notifications);
  v1.use("/me/notifications", ...secured2, mine.inbox);
  v1.use("/me/push-devices", ...secured2, mine.devices);
  v1.use("/me/notification-preferences", ...secured2, mine.preferences);
  v1.use("/me", ...secured2, meRoutes(c.auth));
  v1.use("/farms/:farmId/houses", ...secured2, houseRoutes(c.houses, c.farms));
  v1.use("/farms/:farmId/flocks", ...secured2, flockRoutes(c.flocks, c.farms, c.repos, c.dailyRecords));
  v1.use("/farms/:farmId/daily-records", ...secured2, farmDailyRecordRoutes(c.dailyRecords, c.farms));
  v1.use("/farms/:farmId/dashboard", ...secured2, dashboardRoutes(c.dailyRecords, c.farms));
  v1.use("/farms/:farmId/media", ...secured2, mediaRoutes(c.media, c.farms));
  v1.use("/daily-records", ...secured2, dailyRecordRoutes(c.dailyRecords, c.farms, c.repos));
  v1.use("/farms/:farmId/inventory", ...secured2, inventoryRoutes(c.inventory, c.farms, c.repos));
  v1.use("/farms/:farmId/feed", ...secured2, feedRoutes(c.feed, c.farms));
  v1.use("/farms/:farmId/water-records", ...secured2, waterRoutes(c.feed, c.farms));
  v1.use("/farms/:farmId/alerts", ...secured2, alertRoutes(c.alerts, c.farms, (ctx) => runFarmChecks(c, ctx)));
  v1.use("/farms/:farmId/health/appointments", ...secured2, appointmentRoutes(c.flockHealth, c.farms));
  v1.use("/farms/:farmId/biosecurity", ...secured2, biosecurityRoutes(c.biosecurity, c.farms));
  v1.use("/farms/:farmId/content", ...secured2, contentRoutes(c.content, c.farms));
  v1.use("/farms/:farmId/health", ...secured2, healthRoutes(c.flockHealth, c.farms));
  v1.use("/farms/:farmId/hatchery", ...secured2, hatcheryRoutes(c.hatchery, c.farms));
  const chickOrders = chickOrderRoutes(c.hatchery, c.farms);
  const orderActions = chickOrderActions(c.market, c.farms);
  v1.use("/farms/:farmId/buyers", ...secured2, chickOrders.buyers, orderActions.buyers);
  v1.use("/farms/:farmId/chick-orders", ...secured2, chickOrders.orders, orderActions.orders);
  v1.use("/farms/:farmId/finance", ...secured2, financeRoutes(c.finance, c.farms));
  v1.use("/farms/:farmId/market", ...secured2, sellerMarketRoutes(c.market, c.farms));
  v1.use("/market", ...secured2, buyerMarketRoutes(c.market));
  v1.use("/content", ...secured2, readerContentRoutes(c.content));
  v1.use("/farms/:farmId/reports", ...secured2, reportRoutes(c.reports, c.farms));
  v1.use("/admin/content", ...secured2, editorialContentRoutes(c.content));
  v1.use("/farms/:farmId", ...secured2, intelligenceRoutes({ dashboard: c.dashboard, rules: c.rules, weather: c.weather }, c.farms));
  v1.use("/farms/:farmId/chickstart", ...secured2, chickStartRoutes(c.chickStart, c.farms));
  v1.use("/farms/:farmId/calendar", ...secured2, calendarRoutes(c.calendar, c.farms));
  v1.use("/farms/:farmId/tasks", ...secured2, taskRoutes(c.tasks, c.farms));
  v1.use("/farms", ...secured2, farmRoutes(c.farms, c.audit));
  v1.use("/sync", ...secured2, syncRoutes(c.sync, c.farms));
  app.use(API_PREFIX, v1);
  app.use(notFoundHandler);
  app.use(errorHandler(c.logger));
  return app;
}

// src/adapters/weather.ts
function openMeteoProvider(opts = {}) {
  const base = opts.baseUrl ?? (opts.apiKey ? "https://customer-api.open-meteo.com/v1/forecast" : "https://api.open-meteo.com/v1/forecast");
  const f = opts.fetchImpl ?? fetch;
  return {
    name: "open-meteo",
    async fetch(lat, lng, o) {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max,relative_humidity_2m_min",
        timezone: "auto",
        forecast_days: String(o.forecastDays),
        past_days: String(o.pastDays),
        wind_speed_unit: "kmh"
      });
      if (opts.apiKey) params.set("apikey", opts.apiKey);
      const res = await f(`${base}?${params}`, { signal: AbortSignal.timeout(opts.timeoutMs ?? 8e3) });
      if (!res.ok) throw new Error(`Weather provider returned ${res.status}`);
      const j = await res.json();
      const d = j.daily ?? {};
      const dates = d["time"] ?? [];
      const num = (k, i) => {
        const v = d[k]?.[i];
        return typeof v === "number" ? v : void 0;
      };
      const daily = dates.map((date, i) => {
        const day = { date };
        const set = (key, k) => {
          const v = num(k, i);
          if (v !== void 0) day[key] = v;
        };
        set("tempMaxC", "temperature_2m_max");
        set("tempMinC", "temperature_2m_min");
        set("rainMm", "precipitation_sum");
        set("windMaxKph", "wind_speed_10m_max");
        set("humidityMaxPercent", "relative_humidity_2m_max");
        set("humidityMinPercent", "relative_humidity_2m_min");
        return day;
      });
      const c = j.current;
      return {
        current: { observedAt: c?.time ?? (/* @__PURE__ */ new Date()).toISOString(), ...c?.temperature_2m !== void 0 ? { temperatureC: c.temperature_2m } : {}, ...c?.relative_humidity_2m !== void 0 ? { humidityPercent: c.relative_humidity_2m } : {}, ...c?.precipitation !== void 0 ? { rainMm: c.precipitation } : {}, ...c?.wind_speed_10m !== void 0 ? { windKph: c.wind_speed_10m } : {} },
        daily,
        today: dates[o.pastDays] ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      };
    }
  };
}

// src/adapters/notify.ts
function emailNotificationProvider(email) {
  return {
    channel: "email",
    name: "email-sender",
    async send(m) {
      if (!m.email) throw Object.assign(new Error("No email address"), { retryable: false });
      await email.send({ to: m.email, subject: m.title, text: `${m.body}${m.link?.path ? `

Open in PoultryPilot: ${m.link.path}` : ""}`, kind: "notification" });
      return {};
    }
  };
}
function logPushProvider(logger) {
  return {
    channel: "push",
    name: "log",
    async send(m) {
      logger.info({ notificationId: m.notificationId, userId: m.userId, devices: m.pushTokens?.length ?? 0, title: m.title }, "push (log provider)");
      return {};
    }
  };
}

// src/config/env.ts
import { z as z29 } from "zod";
var csv = (fallback) => z29.string().default(fallback).transform((s2) => s2.split(",").map((v) => v.trim()).filter(Boolean));
var Env = z29.object({
  NODE_ENV: z29.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z29.string().default("0.1.0"),
  HOST: z29.string().default("0.0.0.0"),
  PORT: z29.coerce.number().int().min(1).max(65535).default(4e3),
  TRUST_PROXY: z29.coerce.number().int().min(0).max(10).default(0),
  MONGODB_URI: z29.string().regex(/^mongodb(\+srv)?:\/\//, "Must start with mongodb:// or mongodb+srv://"),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z29.coerce.number().int().min(500).default(5e3),
  MONGODB_MAX_POOL_SIZE: z29.coerce.number().int().min(1).max(500).default(20),
  MONGODB_CONNECT_RETRIES: z29.coerce.number().int().min(0).max(100).default(10),
  MONGODB_AUTO_INDEX: z29.enum(["true", "false"]).optional().transform((v) => v === void 0 ? void 0 : v === "true"),
  JWT_ACCESS_SECRET: z29.string().min(32, "Must be at least 32 characters (generate with: openssl rand -base64 48)"),
  JWT_ISSUER: z29.string().default("poultrypilot-api"),
  ACCESS_TOKEN_TTL_SECONDS: z29.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z29.coerce.number().int().min(1).max(180).default(30),
  SESSION_MAX_DAYS: z29.coerce.number().int().min(1).max(365).default(90),
  LOGIN_MAX_FAILED_ATTEMPTS: z29.coerce.number().int().min(3).max(100).default(10),
  /** Directory for uploaded photos in development. Production should use an S3-compatible adapter. */
  MEDIA_DIR: z29.string().default("./data/media"),
  /** Open-Meteo commercial API key (the free API is non-commercial only). */
  OPEN_METEO_API_KEY: z29.string().optional(),
  /** Photos in an S3-compatible bucket (needed for more than one API instance, or containers without a volume). */
  S3_BUCKET: z29.string().optional(),
  S3_REGION: z29.string().default("us-east-1"),
  /** For R2, MinIO, B2, Spaces: the service's endpoint URL. */
  S3_ENDPOINT: z29.string().url().optional(),
  /**
   * News feeds to import for editorial review, as JSON:
   * [{"url":"https://…/rss","source":"Publisher","regionCode":"IN","category":"markets"}]. Empty: no import.
   */
  NEWS_FEEDS: z29.string().default("[]").transform((v, ctx) => {
    try {
      const list = JSON.parse(v);
      if (!Array.isArray(list)) throw new Error("not a list");
      return list;
    } catch {
      ctx.addIssue({ code: "custom", message: "NEWS_FEEDS must be a JSON list of feeds" });
      return z29.NEVER;
    }
  }),
  LOGIN_LOCK_MINUTES: z29.coerce.number().int().min(1).max(1440).default(15),
  CORS_ORIGINS: csv("http://localhost:5173"),
  RATE_LIMIT_PER_MINUTE: z29.coerce.number().int().min(1).default(300),
  AUTH_RATE_LIMIT_PER_MINUTE: z29.coerce.number().int().min(1).default(10),
  REQUEST_BODY_LIMIT: z29.string().default("1mb"),
  GOOGLE_CLIENT_IDS: csv(""),
  /** Outgoing email (resets, invitations, verification, notifications). Required in production. */
  SMTP_URL: z29.string().url().optional(),
  EMAIL_FROM: z29.string().default("PoultryPilot <no-reply@poultrypilot.app>"),
  /** Push through Firebase Cloud Messaging: a service account with the Firebase Messaging role. Unset: push is logged only. */
  FCM_PROJECT_ID: z29.string().optional(),
  FCM_CLIENT_EMAIL: z29.string().email().optional(),
  /** The service account's private key; "\\n" in the value is turned into new lines. */
  FCM_PRIVATE_KEY: z29.string().optional(),
  APP_BASE_URL: z29.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z29.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOG_FORMAT: z29.enum(["json", "pretty"]).default("json"),
  SHUTDOWN_TIMEOUT_MS: z29.coerce.number().int().min(1e3).default(1e4),
  /** The API contract at /api/v1/openapi.json. Unset: on outside production, off in production (OWASP API9). */
  OPENAPI_ENABLED: z29.enum(["true", "false"]).optional().transform((v) => v === void 0 ? void 0 : v === "true")
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && !env.SMTP_URL) {
    ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "Production needs outgoing email: password resets, invitations and verification cannot work without it" });
  }
  if (env.NODE_ENV === "production" && env.CORS_ORIGINS.some((o) => o === "*")) {
    ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "Wildcard origin is not allowed in production" });
  }
  if (env.NODE_ENV === "production" && /change-me|replace-with/i.test(env.JWT_ACCESS_SECRET)) {
    ctx.addIssue({ code: "custom", path: ["JWT_ACCESS_SECRET"], message: "Placeholder secret used in production" });
  }
});
function loadEnv(source = process.env) {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:
${lines}
See services/api/.env.example.`);
  }
  return parsed.data;
}
function redactMongoUri(uri) {
  return uri.replace(/\/\/([^@/]+)@/, "//***:***@");
}

// src/services/task.service.ts
var PRIORITY = { urgent: 0, high: 1, normal: 2, low: 3 };
function createTaskService(d) {
  const { repos, clock } = d;
  async function todayOf(ctx) {
    const farm = await repos.farms.findById(ctx.farmId);
    return localDateOf(clock.now(), farm.settings.timezone);
  }
  async function viewsOf(ctx, rows, today) {
    const [flocks, houses, members] = await Promise.all([
      repos.flocks.find(ctx.farmId, {}),
      repos.houses.find(ctx.farmId, {}),
      repos.memberships.findByFarm(ctx.farmId)
    ]);
    const users = /* @__PURE__ */ new Map();
    for (const m of members) {
      if (!m.userId || users.has(m.userId)) continue;
      const u = await repos.users.findById(m.userId);
      if (u) users.set(m.userId, u.fullName);
    }
    const flockCode = new Map(flocks.map((f) => [f.id, f.flockCode]));
    const houseName = new Map(houses.map((h) => [h.id, h.name]));
    return rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      title: t.title,
      description: t.description ?? null,
      dueDate: t.dueDate ?? null,
      status: t.status,
      priority: t.priority,
      overdue: !!t.dueDate && t.dueDate < today && (t.status === "open" || t.status === "in_progress"),
      flockId: t.flockId ?? null,
      flockCode: t.flockId ? flockCode.get(t.flockId) ?? null : null,
      houseId: t.houseId ?? null,
      houseName: t.houseId ? houseName.get(t.houseId) ?? null : null,
      assigneeUserId: t.assigneeUserId ?? null,
      assigneeName: t.assigneeUserId ? users.get(t.assigneeUserId) ?? null : null,
      related: t.related ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      completedByName: t.completedBy ? users.get(t.completedBy) ?? null : null,
      resolutionNotes: t.resolutionNotes ?? null,
      version: t.version,
      createdAt: t.createdAt.toISOString()
    }));
  }
  const order = (a, b) => (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : (a.dueDate ?? "9999") > (b.dueDate ?? "9999") ? 1 : PRIORITY[a.priority] - PRIORITY[b.priority];
  async function load(ctx, id, tx) {
    const t = await repos.tasks.findById(ctx.farmId, id, tx);
    if (!t) throw new AppError("NOT_FOUND", "Task not found");
    return t;
  }
  async function checkRefs(ctx, r, tx) {
    if (r.flockId && !await repos.flocks.findById(ctx.farmId, r.flockId, tx)) throw new AppError("VALIDATION_FAILED", "Flock not found on this farm", [{ path: "flockId", message: "Not found" }]);
    if (r.houseId && !await repos.houses.findById(ctx.farmId, r.houseId, tx)) throw new AppError("VALIDATION_FAILED", "House not found on this farm", [{ path: "houseId", message: "Not found" }]);
    if (r.assigneeUserId && !await repos.memberships.findActive(ctx.farmId, r.assigneeUserId, tx)) throw new AppError("VALIDATION_FAILED", "That person is not on this farm", [{ path: "assigneeUserId", message: "Not a member" }]);
  }
  function assertMayWork(ctx, t) {
    assertCan(ctx, "task.complete");
    if (t.assigneeUserId && t.assigneeUserId !== ctx.userId && !can(ctx.role, "task.manage")) throw new AppError("FORBIDDEN", "This task is assigned to someone else");
  }
  async function transition(ctx, id, action, apply, check, expectedVersion) {
    return repos.tx.run(async (tx) => {
      const t = await load(ctx, id, tx);
      check(t);
      if (expectedVersion !== void 0 && expectedVersion !== t.version) throw new AppError("VERSION_CONFLICT", "This task was changed by someone else. Reload it first.", { serverVersion: t.version });
      const patch = { ...apply(t), updatedBy: ctx.userId, updatedAt: clock.now() };
      const next = await repos.tasks.update(ctx.farmId, id, patch, { expectedVersion: t.version }, tx);
      await d.audit.record(ctx, { action: `task.${action}`, entity: "task", entityId: id, before: { status: t.status }, after: { status: next.status } }, tx);
      return next;
    });
  }
  const one = async (ctx, t) => (await viewsOf(ctx, [t], await todayOf(ctx)))[0];
  return {
    async list(ctx, q8) {
      assertCan(ctx, "task.read");
      const today = await todayOf(ctx);
      const statuses = q8.status === "active" ? ["open", "in_progress"] : q8.status === "all" ? void 0 : [q8.status];
      let rows = await repos.tasks.find(ctx.farmId, { where: { ...statuses ? { status: statuses } : {}, ...q8.flockId ? { flockId: q8.flockId } : {}, ...q8.houseId ? { houseId: q8.houseId } : {} } });
      if (q8.assignee === "me") rows = rows.filter((t) => !t.assigneeUserId || t.assigneeUserId === ctx.userId);
      else if (q8.assignee !== "any") rows = rows.filter((t) => t.assigneeUserId === q8.assignee);
      if (q8.due === "overdue") rows = rows.filter((t) => t.dueDate && t.dueDate < today);
      else if (q8.due === "today") rows = rows.filter((t) => t.dueDate === today);
      else if (q8.due === "upcoming") rows = rows.filter((t) => t.dueDate && t.dueDate > today);
      else if (q8.due === "none") rows = rows.filter((t) => !t.dueDate);
      rows.sort(order);
      const items = await viewsOf(ctx, rows.slice(0, q8.limit), today);
      return { today, items, counts: { total: rows.length, overdue: items.filter((t) => t.overdue).length } };
    },
    /**
     * GET /tasks/today: the day's work for this person. Stored tasks due today or overdue (theirs or unassigned),
     * scheduled work from the calendar (today and overdue), and which active flocks still need today's entry.
     */
    async today(ctx) {
      assertCan(ctx, "task.read");
      const today = await todayOf(ctx);
      const mine = (await repos.tasks.find(ctx.farmId, { where: { status: ["open", "in_progress"] } })).filter((t) => (!t.assigneeUserId || t.assigneeUserId === ctx.userId) && (!t.dueDate || t.dueDate <= today)).sort(order);
      const scheduled = (await d.calendar.events(ctx, { from: addDays(today, -30), to: today })).events.filter((e) => e.date === today || e.overdue);
      const entries = can(ctx.role, "production.read") ? (await d.dailyRecords.sheet(ctx, {})).flocks.map((f) => ({ flockId: f.flockId, flockCode: f.flockCode, houseName: f.houseName ?? null, recorded: !!f.record })) : [];
      const tasks = await viewsOf(ctx, mine, today);
      return {
        date: today,
        tasks,
        scheduled,
        dailyEntries: entries,
        counts: { tasks: tasks.length, overdue: tasks.filter((t) => t.overdue).length + scheduled.filter((e) => e.overdue).length, scheduled: scheduled.length, entriesMissing: entries.filter((e) => !e.recorded).length }
      };
    },
    /** Counts for the home screen. */
    async summary(ctx) {
      const today = await todayOf(ctx);
      const active = await repos.tasks.find(ctx.farmId, { where: { status: ["open", "in_progress"] } });
      const mine = active.filter((t) => !t.assigneeUserId || t.assigneeUserId === ctx.userId);
      return {
        open: mine.length,
        dueToday: mine.filter((t) => t.dueDate === today).length,
        overdue: mine.filter((t) => t.dueDate && t.dueDate < today).length,
        next: mine.sort(order).slice(0, 3).map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate ?? null, priority: t.priority, overdue: !!t.dueDate && t.dueDate < today }))
      };
    },
    async get(ctx, id) {
      assertCan(ctx, "task.read");
      return one(ctx, await load(ctx, id));
    },
    async create(ctx, r) {
      assertCan(ctx, "task.manage");
      return repos.tx.run(async (tx) => {
        await checkRefs(ctx, r, tx);
        const id = r.id ?? newId();
        if (r.id && await repos.tasks.findById(ctx.farmId, id, tx)) return one(ctx, await repos.tasks.findById(ctx.farmId, id, tx));
        const now = clock.now();
        const rec = {
          id,
          farmId: ctx.farmId,
          kind: r.kind,
          title: r.title,
          ...r.description ? { description: r.description } : {},
          ...r.dueDate ? { dueDate: r.dueDate } : {},
          status: "open",
          priority: r.priority,
          ...r.flockId ? { flockId: r.flockId } : {},
          ...r.houseId ? { houseId: r.houseId } : {},
          ...r.assigneeUserId ? { assigneeUserId: r.assigneeUserId } : {},
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.tasks.insert(rec, tx);
        await d.audit.record(ctx, { action: "task.created", entity: "task", entityId: id, after: { title: r.title, dueDate: r.dueDate, assigneeUserId: r.assigneeUserId } }, tx);
        return one(ctx, rec);
      });
    },
    async update(ctx, id, r) {
      assertCan(ctx, "task.manage");
      await checkRefs(ctx, r);
      const next = await transition(
        ctx,
        id,
        "updated",
        () => ({ title: r.title, description: r.description, dueDate: r.dueDate, priority: r.priority, flockId: r.flockId, houseId: r.houseId, assigneeUserId: r.assigneeUserId }),
        (t) => {
          if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "Reopen the task before editing it");
        },
        r.version
      );
      return one(ctx, next);
    },
    async start(ctx, id) {
      const next = await transition(ctx, id, "started", () => ({ status: "in_progress" }), (t) => {
        assertMayWork(ctx, t);
        if (t.status !== "open") throw new AppError("INVALID_STATE_TRANSITION", `The task is ${t.status.replace("_", " ")}`);
      });
      return one(ctx, next);
    },
    async complete(ctx, id, r) {
      const next = await transition(
        ctx,
        id,
        "completed",
        () => ({ status: "done", completedAt: clock.now(), completedBy: ctx.userId, ...r.notes ? { resolutionNotes: r.notes } : {} }),
        (t) => {
          assertMayWork(ctx, t);
          if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `The task is already ${t.status}`);
          if (t.kind === "corrective_action" && !r.notes) throw new AppError("VALIDATION_FAILED", "Say what was done to fix it", [{ path: "notes", message: "Required for corrective actions" }]);
        },
        r.version
      );
      return one(ctx, next);
    },
    async cancel(ctx, id, reason) {
      assertCan(ctx, "task.manage");
      const next = await transition(ctx, id, "cancelled", () => ({ status: "cancelled", resolutionNotes: reason }), (t) => {
        if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `The task is already ${t.status}`);
      });
      return one(ctx, next);
    },
    async reopen(ctx, id) {
      assertCan(ctx, "task.manage");
      const next = await transition(ctx, id, "reopened", () => ({ status: "open", completedAt: void 0, completedBy: void 0, verifiedAt: void 0, verifiedBy: void 0 }), (t) => {
        if (t.status !== "done" && t.status !== "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "Only finished or cancelled tasks can be reopened");
      });
      return one(ctx, next);
    }
  };
}

// src/container.ts
import { z as z30 } from "zod";

// src/services/daily-record.service.ts
var LAYING = /* @__PURE__ */ new Set(["layer", "breeder", "custom"]);
var MAX_TREND_DAYS = 366;
var encodeCursor = (date, id) => Buffer.from(JSON.stringify({ d: date, i: id })).toString("base64url");
function decodeCursor(c) {
  try {
    const v = JSON.parse(Buffer.from(c, "base64url").toString("utf8"));
    if (typeof v.d === "string" && typeof v.i === "string") return { date: v.d, id: v.i };
  } catch {
  }
  throw new AppError("VALIDATION_FAILED", "Invalid cursor");
}
function summarize(f) {
  return {
    mortality: f.mortality.reduce((t, m) => t + m.count, 0),
    culls: f.culls,
    feedKg: Math.round(f.feed.filter((x) => (x.kind ?? "consumption") === "consumption").reduce((t, x) => t + x.quantityKg, 0) * 1e3) / 1e3,
    ...f.waterLitres !== void 0 ? { waterLitres: f.waterLitres } : {},
    ...f.eggs ? { eggsCollected: f.eggs.collected, eggsBroken: f.eggs.broken } : {},
    ...f.averageWeight ? { averageWeightG: f.averageWeight.averageWeightG } : {},
    observations: f.healthObservations.length,
    photos: f.photos.length
  };
}
var summaryView = (s2) => ({
  mortality: s2?.mortality ?? 0,
  culls: s2?.culls ?? 0,
  feedKg: s2?.feedKg ?? 0,
  waterLitres: s2?.waterLitres ?? null,
  eggsCollected: s2?.eggsCollected ?? null,
  eggsBroken: s2?.eggsBroken ?? null,
  averageWeightG: s2?.averageWeightG ?? null,
  observations: s2?.observations ?? 0,
  photos: s2?.photos ?? 0
});
function aliveFromAggregates(rows, reversals) {
  const sign = { placement: 1, transfer_in: 1, split_in: 1, merge_in: 1, mortality: -1, cull: -1, sale: -1, transfer_out: -1, split_out: -1, merge_out: -1 };
  const out = /* @__PURE__ */ new Map();
  const apply = (r, k) => {
    const flockId = r.key["flockId"];
    const type = r.key["type"];
    let v = (sign[type] ?? 0) * (r.sums["birds"] ?? 0);
    if (type === "placement") v -= r.sums["deadOnArrival"] ?? 0;
    if (type === "adjustment") v += r.sums["delta"] ?? 0;
    out.set(flockId, (out.get(flockId) ?? 0) + k * v);
  };
  rows.forEach((r) => apply(r, 1));
  reversals.forEach((r) => apply(r, -1));
  return out;
}
function createDailyRecordService(d) {
  const { repos, clock } = d;
  const L = d.flocks.ledger;
  const mediaUrl = (farmId, assetId) => `/api/v1/farms/${farmId}/media/${assetId}`;
  function assertMayWrite(ctx, farm, date, existing, verb) {
    const privileged = verb === "delete" ? can(ctx.role, "production.delete") : can(ctx.role, "production.edit_any");
    if (privileged) return;
    const windowStart = addDays(L.todayOf(farm), -farm.settings.workerEditWindowDays);
    if (date < windowStart) throw forbidden(`You can ${verb} days from ${windowStart} onwards. Ask a supervisor for older days.`);
    if (existing && existing.createdBy !== ctx.userId) throw forbidden(`You can only ${verb} daily records you created`);
  }
  async function assertPhotos(ctx, photos, tx) {
    for (const p6 of photos) {
      const asset = await repos.mediaAssets.findById(ctx.farmId, p6.assetId, tx);
      if (!asset) throw new AppError("NOT_FOUND", `Photo ${p6.assetId} not found on this farm. Upload it first.`);
    }
  }
  async function writeDay(ctx, farm, flock, date, f, existing, recordId, tx) {
    L.assertStatus(flock, ["active"], "record a day");
    L.assertDate(date, farm, flock);
    for (const x of f.feed) L.assertCurrency(x.unitCostPerKg, farm, "unitCostPerKg");
    if (f.waterQuality && f.waterLitres === void 0) throw new AppError("VALIDATION_FAILED", "Give waterLitres with waterQuality");
    if (f.eggs && !LAYING.has(flock.type)) throw new AppError("VALIDATION_FAILED", `${flock.flockCode} is a ${flock.type} flock; eggs are recorded for layer, breeder and custom flocks`);
    await assertPhotos(ctx, f.photos, tx);
    const now = clock.now();
    const summary = summarize(f);
    const head = {
      observedBirdCount: f.observedBirdCount,
      temperatureMinC: f.temperatureMinC,
      temperatureMaxC: f.temperatureMaxC,
      humidityPercent: f.humidityPercent,
      lightingHours: f.lightingHours,
      notes: f.notes,
      photos: f.photos.map((p6) => ({ assetId: p6.assetId, ...p6.caption ? { caption: p6.caption } : {} })),
      summary
    };
    let record;
    if (existing) {
      const next = await repos.dailyRecords.update(ctx.farmId, existing.id, { ...head, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: existing.version }, tx);
      if (!next) throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.");
      record = next;
    } else {
      record = {
        id: recordId ?? newId(),
        farmId: ctx.farmId,
        flockId: flock.id,
        date,
        houseId: flock.houseId,
        flockType: flock.type,
        ...Object.fromEntries(Object.entries(head).filter(([, v]) => v !== void 0)),
        photos: head.photos,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      await repos.dailyRecords.insert(record, tx).catch(duplicate(`A daily record for ${flock.flockCode} on ${date}`));
    }
    const events = await L.loadEvents(ctx, flock.id, tx);
    const live = new Set(effectiveEvents(events.map(toLedger)).map((e) => e.id));
    const linked = events.filter((e) => e.dailyRecordId === record.id && live.has(e.id) && ["mortality", "cull", "weighing"].includes(e.type));
    const wanted = [
      ...f.mortality.map((m) => ({ type: "mortality", date, birds: m.count, cause: m.cause, dailyRecordId: record.id })),
      ...f.culls > 0 ? [{ type: "cull", date, birds: f.culls, dailyRecordId: record.id }] : [],
      ...f.averageWeight ? [{ type: "weighing", date, averageWeightG: f.averageWeight.averageWeightG, ...f.averageWeight.sampleSize ? { sampleSize: f.averageWeight.sampleSize } : {}, dailyRecordId: record.id }] : []
    ];
    const eventKey = (xs) => xs.map((x) => [x.type, x.cause ?? "", x.birds ?? "", x.averageWeightG ?? "", x.sampleSize ?? ""].join(":")).sort().join("|");
    if (eventKey(linked) !== eventKey(wanted)) {
      const reversals = linked.map((e) => ({
        type: e.type,
        date: e.date,
        reversalOf: e.id,
        reason: "Daily record edited",
        dailyRecordId: record.id,
        ...e.birds !== void 0 ? { birds: e.birds } : {}
      }));
      await L.appendEvents(ctx, flock, events, [...reversals, ...wanted], {}, farm, tx, "flock.daily_record_saved");
    }
    const oldFeed = await repos.feedConsumption.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx);
    const lineKey = (x) => [x.kind ?? "consumption", x.quantityKg, x.feedItemId ?? "", x.feedItemId ? "" : x.unitCostMinor ?? "", x.reason ?? ""].join(":");
    const oldKey = oldFeed.map((x) => lineKey({ ...x, ...x.cost && !x.feedItemId ? { unitCostMinor: Math.round(x.cost.amountMinor) } : {} })).sort().join("|");
    const newKey = f.feed.map((x) => lineKey({ ...x, ...x.unitCostPerKg ? { unitCostMinor: Math.round(x.unitCostPerKg.amountMinor * x.quantityKg) } : {} })).sort().join("|");
    if (oldKey !== newKey) {
      for (const x of oldFeed) await d.feed.removeFeed(ctx, farm, x, tx);
      for (const x of f.feed) await d.feed.recordFeed(ctx, farm, flock, date, x, tx, { dailyRecordId: record.id });
    }
    const water = (await repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx))[0];
    const waterKey = `water:${flock.id}:${date}`;
    if (f.waterLitres !== void 0) {
      const rules = await d.waterRules?.(ctx, tx) ?? void 0;
      const window = rules?.windowDays ?? 7;
      const previous = await repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id }, range: { field: "date", from: addDays(date, -window), to: addDays(date, -1) } }, tx);
      const q8 = f.waterQuality ?? {};
      const check = evaluateWater({ litres: f.waterLitres, previousDays: previous.map((w) => w.litres), ...q8.ph !== void 0 ? { ph: q8.ph } : {}, ...q8.tdsPpm !== void 0 ? { tdsPpm: q8.tdsPpm } : {}, ...rules ? { rules } : {} });
      const fields = {
        litres: f.waterLitres,
        dailyRecordId: record.id,
        source: q8.source,
        ph: q8.ph,
        tdsPpm: q8.tdsPpm,
        chlorinePpm: q8.chlorinePpm,
        qualityRating: q8.qualityRating,
        treatment: q8.treatment,
        treatmentNotes: q8.treatmentNotes,
        flags: check.flags.length ? check.flags : void 0,
        baselineLitres: check.baselineLitres === null ? void 0 : Math.round(check.baselineLitres * 10) / 10
      };
      if (!water) {
        await repos.waterRecords.insert({ id: newId(), farmId: ctx.farmId, flockId: flock.id, date, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== void 0)), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
      } else {
        await repos.waterRecords.update(ctx.farmId, water.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, void 0, tx);
      }
      if (check.flags.length) {
        const words = {
          consumption_high: `water intake ${Math.round(check.deviationPercent ?? 0)}% above the recent average of ${Math.round(check.baselineLitres ?? 0)} L`,
          consumption_low: `water intake ${Math.round(-(check.deviationPercent ?? 0))}% below the recent average of ${Math.round(check.baselineLitres ?? 0)} L`,
          ph_low: `pH ${q8.ph} is below the limit`,
          ph_high: `pH ${q8.ph} is above the limit`,
          tds_high: `dissolved solids ${q8.tdsPpm} ppm are above the limit`
        };
        await d.alerts.raise(ctx, {
          ruleType: "water_abnormal",
          severity: check.flags.includes("consumption_low") ? "critical" : "warning",
          title: `Water: ${flock.flockCode} on ${date}`,
          message: `${flock.flockCode}: ${check.flags.map((x) => words[x]).join("; ")}. Check drinkers, water lines and the birds; contact your veterinarian if it continues.`,
          dedupKey: waterKey,
          date,
          flockId: flock.id,
          values: { litres: f.waterLitres, ...check.baselineLitres !== null ? { baselineLitres: check.baselineLitres } : {} }
        }, tx);
      } else await d.alerts.resolve(ctx, waterKey, tx);
    } else if (water) {
      await repos.waterRecords.update(ctx.farmId, water.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, void 0, tx);
      await d.alerts.resolve(ctx, waterKey, tx);
    }
    await writeEggs(ctx, flock, date, record.id, f.eggs, now, tx);
    if (f.eggs) await d.afterEggsWritten?.(ctx, flock.id, tx);
    const oldObs = await repos.healthRecords.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx);
    const obsKey = (xs) => xs.map((x) => `${x.observedSigns ?? x.signs}:${x.affectedBirds ?? ""}`).sort().join("|");
    if (obsKey(oldObs) !== obsKey(f.healthObservations)) {
      for (const o of oldObs) await repos.healthRecords.update(ctx.farmId, o.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, void 0, tx);
      const obs = f.healthObservations.map((o) => ({
        id: newId(),
        farmId: ctx.farmId,
        flockId: flock.id,
        houseId: record.houseId,
        type: "observation",
        date,
        title: o.signs.length > 80 ? `${o.signs.slice(0, 77)}\u2026` : o.signs,
        observedSigns: o.signs,
        ...o.affectedBirds !== void 0 ? { affectedBirds: o.affectedBirds } : {},
        dailyRecordId: record.id,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0
      }));
      await repos.healthRecords.insertMany(obs, tx);
    }
    await d.audit.record(ctx, { action: existing ? "daily_record.updated" : "daily_record.created", entity: "daily_record", entityId: record.id, after: { flockId: flock.id, date, ...summary } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "daily_record", entityId: record.id, op: "upsert", version: record.version, document: listItem(record, flock.flockCode) }, tx);
    return record;
  }
  async function writeEggs(ctx, flock, date, recordId, eggs, now, tx) {
    const existing = (await repos.eggRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx))[0];
    const postings = existing ? await repos.eggInventory.find(ctx.farmId, { where: { sourceId: existing.id } }, tx) : [];
    const reversed = new Set(postings.filter((p6) => p6.reversalOf).map((p6) => p6.reversalOf));
    const livePostings = postings.filter((p6) => !p6.reversalOf && !reversed.has(p6.id));
    const reverseAll = async () => {
      const rev = livePostings.map((p6) => ({
        id: newId(),
        farmId: ctx.farmId,
        date: p6.date,
        type: "reversal",
        quantityDelta: -p6.quantityDelta,
        ...p6.grade ? { grade: p6.grade } : {},
        flockId: flock.id,
        sourceType: "egg_record",
        sourceId: p6.sourceId,
        reversalOf: p6.id,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now
      }));
      await repos.eggInventory.insertMany(rev, tx);
    };
    if (!eggs) {
      if (existing) {
        await reverseAll();
        await repos.eggRecords.update(ctx.farmId, existing.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, void 0, tx);
      }
      return;
    }
    const byGrade = eggs.byGrade ? Object.fromEntries(Object.entries(eggs.byGrade).filter(([, n]) => (n ?? 0) > 0)) : void 0;
    let egg;
    const fields = { collected: eggs.collected, broken: eggs.broken, byGrade, averageEggWeightG: eggs.averageEggWeightG, qualityNotes: eggs.qualityNotes, dailyRecordId: recordId };
    if (existing) {
      egg = await repos.eggRecords.update(ctx.farmId, existing.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, void 0, tx);
    } else {
      egg = {
        id: newId(),
        farmId: ctx.farmId,
        flockId: flock.id,
        date,
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== void 0)),
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      await repos.eggRecords.insert(egg, tx);
    }
    const graded = Object.entries(byGrade ?? {});
    const ungraded = eggs.collected - eggs.broken - graded.reduce((t, [, n]) => t + n, 0);
    const wantedPostings = [
      ...graded.map(([grade, n]) => ({ type: "collected", grade, quantityDelta: n })),
      ...ungraded > 0 ? [{ type: "collected", quantityDelta: ungraded }] : []
    ];
    const key = (xs) => xs.map((x) => `${x.type}:${x.grade ?? ""}:${x.quantityDelta}`).sort().join("|");
    if (key(livePostings) !== key(wantedPostings)) {
      await reverseAll();
      await repos.eggInventory.insertMany(
        wantedPostings.map((w) => ({ id: newId(), farmId: ctx.farmId, date, ...w, flockId: flock.id, sourceType: "egg_record", sourceId: egg.id, createdBy: ctx.userId, createdAt: now, updatedAt: now })),
        tx
      );
    }
  }
  const listItem = (r, flockCode) => ({
    id: r.id,
    flockId: r.flockId,
    flockCode,
    houseId: r.houseId,
    flockType: r.flockType,
    date: r.date,
    summary: summaryView(r.summary),
    version: r.version,
    createdBy: r.createdBy,
    updatedAt: r.updatedAt.toISOString()
  });
  async function ownFields(ctx, record, tx) {
    const none = { mortality: [], culls: 0, feed: [], healthObservations: [], photos: [] };
    if (!record) return none;
    const [events, feed, water, eggs, obs] = await Promise.all([
      L.loadEvents(ctx, record.flockId, tx),
      repos.feedConsumption.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx),
      repos.waterRecords.find(ctx.farmId, { where: { dailyRecordId: record.id }, limit: 1 }, tx),
      repos.eggRecords.find(ctx.farmId, { where: { dailyRecordId: record.id }, limit: 1 }, tx),
      repos.healthRecords.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx)
    ]);
    const live = new Set(effectiveEvents(events.map(toLedger)).map((e) => e.id));
    const mine = events.filter((e) => e.dailyRecordId === record.id && live.has(e.id));
    const weighing = mine.find((e) => e.type === "weighing");
    const w = water[0];
    const egg = eggs[0];
    const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
    return {
      ...defined({ observedBirdCount: record.observedBirdCount, temperatureMinC: record.temperatureMinC, temperatureMaxC: record.temperatureMaxC, humidityPercent: record.humidityPercent, lightingHours: record.lightingHours, notes: record.notes }),
      mortality: mine.filter((e) => e.type === "mortality").map((e) => ({ cause: e.cause ?? "unknown", count: e.birds ?? 0 })),
      culls: mine.filter((e) => e.type === "cull").reduce((t, e) => t + (e.birds ?? 0), 0),
      feed: feed.map((x) => ({
        quantityKg: x.quantityKg,
        kind: x.kind ?? "consumption",
        ...x.feedItemId ? { feedItemId: x.feedItemId } : {},
        // Untracked feed keeps its price (per kg), so the line compares equal and is not rewritten.
        ...!x.feedItemId && x.cost ? { unitCostPerKg: { amountMinor: x.cost.amountMinor / x.quantityKg, currency: x.cost.currency } } : {}
      })),
      ...w ? { waterLitres: w.litres, ...w.source || w.ph !== void 0 || w.tdsPpm !== void 0 || w.chlorinePpm !== void 0 || w.qualityRating || w.treatment ? { waterQuality: defined({ source: w.source, ph: w.ph, tdsPpm: w.tdsPpm, chlorinePpm: w.chlorinePpm, qualityRating: w.qualityRating, treatment: w.treatment, treatmentNotes: w.treatmentNotes }) } : {} } : {},
      ...egg ? { eggs: defined({ collected: egg.collected, broken: egg.broken, byGrade: egg.byGrade, averageEggWeightG: egg.averageEggWeightG, qualityNotes: egg.qualityNotes }) } : {},
      ...weighing?.averageWeightG ? { averageWeight: defined({ averageWeightG: weighing.averageWeightG, sampleSize: weighing.sampleSize }) } : {},
      healthObservations: obs.map((o) => defined({ signs: o.observedSigns ?? o.title, affectedBirds: o.affectedBirds })),
      photos: record.photos ?? []
    };
  }
  async function fullView(ctx, flock, date, record, tx) {
    const [events, feed, waterList, eggList, obs] = await Promise.all([
      L.loadEvents(ctx, flock.id, tx),
      repos.feedConsumption.find(ctx.farmId, { where: { flockId: flock.id, date } }, tx),
      repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx),
      repos.eggRecords.find(ctx.farmId, { where: { flockId: flock.id, date }, limit: 1 }, tx),
      record ? repos.healthRecords.find(ctx.farmId, { where: { dailyRecordId: record.id } }, tx) : Promise.resolve([])
    ]);
    const ledger = events.map(toLedger);
    const live = new Set(effectiveEvents(ledger).map((e) => e.id));
    const day = events.filter((e) => e.date === date && live.has(e.id));
    const mortality = day.filter((e) => e.type === "mortality").map((e) => ({ cause: e.cause ?? "unknown", count: e.birds ?? 0, eventId: e.id, fromDailyRecord: !!e.dailyRecordId }));
    const weighing = record ? day.find((e) => e.type === "weighing" && e.dailyRecordId === record.id) : void 0;
    const aliveEnd = population(ledger, date).alive;
    const aliveStart = population(ledger, addDays(date, -1)).alive;
    const egg = eggList[0];
    const water = waterList[0];
    return {
      id: record?.id ?? null,
      flockId: flock.id,
      flockCode: flock.flockCode,
      houseId: record?.houseId ?? flock.houseId,
      flockType: flock.type,
      date,
      ...record?.observedBirdCount !== void 0 ? { observedBirdCount: record.observedBirdCount, countDifference: record.observedBirdCount - aliveEnd } : {},
      birdsAliveEndOfDay: aliveEnd,
      mortality,
      mortalityTotal: mortality.reduce((t, m) => t + m.count, 0),
      culls: day.filter((e) => e.type === "cull").reduce((t, e) => t + (e.birds ?? 0), 0),
      // fromDailyRecord: entered in this record (a PATCH of `feed` replaces these); others came from feed use entries.
      feed: feed.map((x) => ({ id: x.id, kind: x.kind ?? "consumption", quantityKg: x.quantityKg, ...x.feedItemId ? { feedItemId: x.feedItemId } : {}, ...x.cost ? { cost: x.cost } : {}, fromDailyRecord: !!record && x.dailyRecordId === record.id })),
      feedKg: Math.round(feed.filter((x) => (x.kind ?? "consumption") === "consumption").reduce((t, x) => t + x.quantityKg, 0) * 1e3) / 1e3,
      ...water ? { waterLitres: water.litres } : {},
      ...water ? {
        water: {
          ...water.source ? { source: water.source } : {},
          ...water.ph !== void 0 ? { ph: water.ph } : {},
          ...water.tdsPpm !== void 0 ? { tdsPpm: water.tdsPpm } : {},
          ...water.chlorinePpm !== void 0 ? { chlorinePpm: water.chlorinePpm } : {},
          ...water.qualityRating ? { qualityRating: water.qualityRating } : {},
          ...water.treatment ? { treatment: water.treatment } : {},
          ...water.treatmentNotes ? { treatmentNotes: water.treatmentNotes } : {},
          flags: water.flags ?? [],
          baselineLitres: water.baselineLitres ?? null
        }
      } : {},
      ...record?.temperatureMinC !== void 0 ? { temperatureMinC: record.temperatureMinC } : {},
      ...record?.temperatureMaxC !== void 0 ? { temperatureMaxC: record.temperatureMaxC } : {},
      ...record?.humidityPercent !== void 0 ? { humidityPercent: record.humidityPercent } : {},
      ...record?.lightingHours !== void 0 ? { lightingHours: record.lightingHours } : {},
      ...egg ? {
        eggs: {
          collected: egg.collected,
          broken: egg.broken,
          ...egg.byGrade ? { byGrade: egg.byGrade } : {},
          ...egg.averageEggWeightG !== void 0 ? { averageEggWeightG: egg.averageEggWeightG } : {},
          ...egg.qualityNotes ? { qualityNotes: egg.qualityNotes } : {},
          ...egg.withheldUntil ? { withheldUntil: egg.withheldUntil } : {},
          henDayPercent: henDayPercent(egg.collected, aliveStart)
        }
      } : {},
      ...weighing ? { averageWeight: { averageWeightG: weighing.averageWeightG, ...weighing.sampleSize ? { sampleSize: weighing.sampleSize } : {}, eventId: weighing.id } } : {},
      healthObservations: obs.map((o) => ({ id: o.id, signs: o.observedSigns ?? o.title, ...o.affectedBirds !== void 0 ? { affectedBirds: o.affectedBirds } : {} })),
      ...record?.notes ? { notes: record.notes } : {},
      photos: (record?.photos ?? []).map((p6) => ({ assetId: p6.assetId, ...p6.caption ? { caption: p6.caption } : {}, url: mediaUrl(ctx.farmId, p6.assetId) })),
      version: record?.version ?? null,
      ...record ? { createdBy: record.createdBy, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() } : {}
    };
  }
  const minimal = (r) => ({ id: r.id, version: r.version, summary: summaryView(r.summary) });
  async function loadRecord(ctx, id, tx) {
    const r = await repos.dailyRecords.findById(ctx.farmId, id, tx);
    if (!r) throw notFound("Daily record");
    return r;
  }
  async function eventSums(farmId, flockIds, range, by, types) {
    const base = { where: { flockId: flockIds, ...types ? { type: types } : {} }, range: { field: "date", ...range } };
    const [rows, reversals] = await Promise.all([
      repos.flockEvents.aggregate(farmId, { ...base, exists: { reversalOf: false } }, by, ["birds", "deadOnArrival", "delta"]),
      repos.flockEvents.aggregate(farmId, { ...base, exists: { reversalOf: true } }, by, ["birds", "deadOnArrival", "delta"])
    ]);
    return { rows, reversals };
  }
  const netBirds = (sumsByKey, keyOf) => {
    const out = /* @__PURE__ */ new Map();
    for (const r of sumsByKey.rows) out.set(keyOf(r), (out.get(keyOf(r)) ?? 0) + (r.sums["birds"] ?? 0));
    for (const r of sumsByKey.reversals) out.set(keyOf(r), (out.get(keyOf(r)) ?? 0) - (r.sums["birds"] ?? 0));
    return out;
  };
  async function flocksFor(ctx, q8, statuses) {
    if (q8.flockId) {
      const f = await repos.flocks.findById(ctx.farmId, q8.flockId);
      if (!f) throw notFound("Flock");
      return [f];
    }
    const where = {};
    if (q8.houseId) where["houseId"] = q8.houseId;
    if (q8.type) where["type"] = q8.type;
    if (statuses) where["status"] = statuses;
    return repos.flocks.find(ctx.farmId, { where });
  }
  const sumMap = (rows, field, keyField = "flockId") => new Map(rows.map((r) => [r.key[keyField], r.sums[field] ?? 0]));
  return {
    async create(ctx, body, opts = {}) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, body.flockId, tx);
        assertMayWrite(ctx, farm, body.date, null, "record");
        const clash = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId: flock.id, date: body.date }, limit: 1 }, tx))[0];
        if (clash) {
          throw new AppError("DUPLICATE", `${flock.flockCode} already has a record for ${body.date}. Update it instead.`, { existingId: clash.id, version: clash.version });
        }
        const { id, flockId: _f, date, ...fields } = body;
        const record = await writeDay(ctx, farm, flock, date, fields, null, id, tx);
        return opts.minimal ? minimal(record) : fullView(ctx, flock, date, record, tx);
      });
    },
    async update(ctx, id, body, opts = {}) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const existing = await loadRecord(ctx, id, tx);
        assertMayWrite(ctx, farm, existing.date, existing, "edit");
        if (existing.version !== body.version) throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.", { serverVersion: existing.version });
        const flock = await L.loadFlock(ctx, existing.flockId, tx);
        const { version: _v, ...fields } = body;
        const record = await writeDay(ctx, farm, flock, existing.date, fields, existing, void 0, tx);
        return opts.minimal ? minimal(record) : fullView(ctx, flock, existing.date, record, tx);
      });
    },
    /**
     * Changes only the sections given and keeps the rest of the day as recorded: e.g. eggs entered on the egg screen
     * do not erase the feed and deaths entered earlier. The record's own entries are rebuilt from their sources
     * (linked by dailyRecordId), so entries made outside the record are never copied into it.
     */
    async patchByFlockDate(ctx, flockId, date, body) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, flockId, tx);
        const existing = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId, date }, limit: 1 }, tx))[0] ?? null;
        assertMayWrite(ctx, farm, date, existing, existing ? "edit" : "record");
        if (existing && (body.version === void 0 || body.version !== existing.version)) {
          throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.", { serverVersion: existing.version });
        }
        const { version: _v, ...partial } = body;
        const current = await ownFields(ctx, existing, tx);
        const merged = { ...current, ...Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== void 0)) };
        const record = await writeDay(ctx, farm, flock, date, merged, existing, void 0, tx);
        return fullView(ctx, flock, date, record, tx);
      });
    },
    /** Create or replace by flock and date: the offline-friendly entry point (natural key, idempotent). */
    async upsertByFlockDate(ctx, flockId, date, body, opts = {}) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, flockId, tx);
        const existing = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId, date }, limit: 1 }, tx))[0] ?? null;
        assertMayWrite(ctx, farm, date, existing, existing ? "edit" : "record");
        if (existing && (body.version === void 0 || body.version !== existing.version)) {
          throw new AppError("VERSION_CONFLICT", "This day's record was changed by someone else. Reload it first.", { serverVersion: existing.version });
        }
        const { version: _v, ...fields } = body;
        const record = await writeDay(ctx, farm, flock, date, fields, existing, void 0, tx);
        return opts.minimal ? minimal(record) : fullView(ctx, flock, date, record, tx);
      });
    },
    /**
     * Deletes a record and undoes everything it wrote: its deaths, culls and weighing are reversed in the flock
     * ledger, its egg stock postings are reversed, and its feed, water, eggs and observations are soft-deleted.
     */
    async remove(ctx, id) {
      assertCan(ctx, "production.record");
      await repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const record = await loadRecord(ctx, id, tx);
        assertMayWrite(ctx, farm, record.date, record, "delete");
        const flock = await L.loadFlock(ctx, record.flockId, tx);
        L.assertStatus(flock, ["active"], "delete a daily record");
        const now = clock.now();
        const empty = { mortality: [], culls: 0, feed: [], healthObservations: [], photos: [] };
        await writeDay(ctx, farm, flock, record.date, empty, record, void 0, tx);
        const current = await loadRecord(ctx, id, tx);
        await repos.dailyRecords.update(ctx.farmId, id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, { expectedVersion: current.version }, tx);
        await d.audit.record(ctx, { action: "daily_record.deleted", entity: "daily_record", entityId: id, before: { flockId: record.flockId, date: record.date, ...record.summary } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "daily_record", entityId: id, op: "delete", version: current.version + 1 }, tx);
      });
    },
    async get(ctx, id) {
      assertCan(ctx, "production.read");
      const record = await loadRecord(ctx, id);
      return fullView(ctx, await L.loadFlock(ctx, record.flockId), record.date, record);
    },
    /** The day for one flock, even if no record exists (separate death entries, feed, water still show). */
    async getByFlockDate(ctx, flockId, date) {
      assertCan(ctx, "production.read");
      const flock = await L.loadFlock(ctx, flockId);
      const record = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId, date }, limit: 1 }))[0] ?? null;
      return fullView(ctx, flock, date, record);
    },
    /** Compact, paginated list (newest first). Filters: date or from/to, house, flock, flock type. */
    async list(ctx, q8) {
      assertCan(ctx, "production.read");
      const where = {};
      if (q8.flockId) where["flockId"] = q8.flockId;
      if (q8.houseId) where["houseId"] = q8.houseId;
      if (q8.type) where["flockType"] = q8.type;
      const range = q8.date ? { from: q8.date, to: q8.date } : { ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} };
      const rows = await repos.dailyRecords.find(ctx.farmId, {
        where,
        range: { field: "date", ...range },
        sort: [{ field: "date", dir: -1 }, { field: "id", dir: -1 }],
        limit: q8.limit + 1,
        ...q8.cursor ? { after: decodeCursor(q8.cursor) } : {}
      });
      const page = rows.slice(0, q8.limit);
      const codes = new Map((await repos.flocks.find(ctx.farmId, { where: { id: [...new Set(page.map((r) => r.flockId))] } })).map((f) => [f.id, f.flockCode]));
      const last = page[page.length - 1];
      return { items: page.map((r) => listItem(r, codes.get(r.flockId) ?? "")), nextCursor: rows.length > q8.limit && last ? encodeCursor(last.date, last.id) : null };
    },
    /** Everything a phone needs to enter a day, in one call: active flocks, expected birds, today's and yesterday's records. */
    async sheet(ctx, q8) {
      assertCan(ctx, "production.read");
      const farm = await L.farmOf(ctx);
      const today = L.todayOf(farm);
      const date = q8.date ?? today;
      const [flocks, houses, records, previous] = await Promise.all([
        repos.flocks.find(ctx.farmId, { where: { status: "active" } }),
        repos.houses.find(ctx.farmId),
        repos.dailyRecords.find(ctx.farmId, { where: { date } }),
        repos.dailyRecords.find(ctx.farmId, { where: { date: addDays(date, -1) } })
      ]);
      const houseName = new Map(houses.map((h) => [h.id, h.name]));
      const recBy = new Map(records.map((r) => [r.flockId, r]));
      const nameOf = /* @__PURE__ */ new Map();
      for (const id of new Set(records.flatMap((r) => [r.createdBy, r.updatedBy].filter((x) => !!x)))) {
        const u = await repos.users.findById(id);
        if (u) nameOf.set(id, u.fullName);
      }
      const prevBy = new Map(previous.map((r) => [r.flockId, r]));
      let alive = new Map(flocks.map((f) => [f.id, f.population?.alive ?? 0]));
      if (date !== today && flocks.length) {
        const s2 = await eventSums(ctx.farmId, flocks.map((f) => f.id), { to: date }, ["flockId", "type"]);
        alive = aliveFromAggregates(s2.rows, s2.reversals);
      }
      return {
        date,
        today,
        editWindowStart: addDays(today, -farm.settings.workerEditWindowDays),
        flocks: flocks.sort((a, b) => (houseName.get(a.houseId) ?? "").localeCompare(houseName.get(b.houseId) ?? "") || a.flockCode.localeCompare(b.flockCode)).map((f) => {
          const r = recBy.get(f.id);
          const p6 = prevBy.get(f.id);
          return {
            flockId: f.id,
            flockCode: f.flockCode,
            name: f.name,
            type: f.type,
            houseId: f.houseId,
            houseName: houseName.get(f.houseId) ?? "",
            expectedBirds: alive.get(f.id) ?? 0,
            laying: LAYING.has(f.type),
            record: r ? { id: r.id, version: r.version, summary: summaryView(r.summary), recordedByName: nameOf.get(r.createdBy) ?? null, lastChangedByName: nameOf.get(r.updatedBy ?? r.createdBy) ?? null, updatedAt: r.updatedAt.toISOString() } : null,
            previous: p6 ? summaryView(p6.summary) : null
          };
        })
      };
    },
    /** One day across the farm: per-flock and total figures, aggregated on the database server from the source collections. */
    async dashboardDay(ctx, q8) {
      assertCan(ctx, "production.read");
      const farm = await L.farmOf(ctx);
      const date = q8.date ?? L.todayOf(farm);
      const flocks = (await flocksFor(ctx, q8, ["active", "closed"])).filter((f) => f.status === "active" || f.closedDate !== void 0 && f.closedDate >= date);
      const ids = flocks.map((f) => f.id);
      const zero = { birdsAlive: 0, mortality: 0, culls: 0, feedKg: 0, waterLitres: 0, eggsCollected: 0, eggsBroken: 0, henDayPercent: null, mortalityRatePercent: null };
      if (!ids.length) return { date, totals: zero, flocksTotal: 0, flocksRecorded: 0, flocks: [] };
      const [toDate, toYesterday, today, feed, water, eggs, records, weighings] = await Promise.all([
        eventSums(ctx.farmId, ids, { to: date }, ["flockId", "type"]),
        eventSums(ctx.farmId, ids, { to: addDays(date, -1) }, ["flockId", "type"]),
        eventSums(ctx.farmId, ids, { from: date, to: date }, ["flockId", "type"], ["mortality", "cull"]),
        repos.feedConsumption.aggregate(ctx.farmId, { where: { flockId: ids }, range: { field: "date", from: date, to: date } }, ["flockId"], ["quantityKg"]),
        repos.waterRecords.aggregate(ctx.farmId, { where: { flockId: ids }, range: { field: "date", from: date, to: date } }, ["flockId"], ["litres"]),
        repos.eggRecords.aggregate(ctx.farmId, { where: { flockId: ids }, range: { field: "date", from: date, to: date } }, ["flockId"], ["collected", "broken"]),
        repos.dailyRecords.find(ctx.farmId, { where: { flockId: ids, date } }),
        repos.flockEvents.find(ctx.farmId, { where: { flockId: ids, type: "weighing" }, range: { field: "date", to: date }, sort: [{ field: "date", dir: -1 }] })
      ]);
      const aliveEnd = aliveFromAggregates(toDate.rows, toDate.reversals);
      const aliveStart = aliveFromAggregates(toYesterday.rows, toYesterday.reversals);
      const deaths = netBirds({ rows: today.rows.filter((r) => r.key["type"] === "mortality"), reversals: today.reversals.filter((r) => r.key["type"] === "mortality") }, (r) => r.key["flockId"]);
      const culls = netBirds({ rows: today.rows.filter((r) => r.key["type"] === "cull"), reversals: today.reversals.filter((r) => r.key["type"] === "cull") }, (r) => r.key["flockId"]);
      const feedBy = sumMap(feed, "quantityKg");
      const waterBy = sumMap(water, "litres");
      const eggsBy = sumMap(eggs, "collected");
      const brokenBy = sumMap(eggs, "broken");
      const recBy = new Map(records.map((r) => [r.flockId, r.id]));
      const reversedWeighings = new Set(weighings.filter((w) => w.reversalOf).map((w) => w.reversalOf));
      const latestWeight = /* @__PURE__ */ new Map();
      for (const w of weighings) if (!w.reversalOf && !reversedWeighings.has(w.id) && !latestWeight.has(w.flockId) && w.averageWeightG) latestWeight.set(w.flockId, w.averageWeightG);
      const rows = flocks.map((f) => {
        const start = aliveStart.get(f.id) ?? 0;
        const m = deaths.get(f.id) ?? 0;
        const e = eggsBy.get(f.id) ?? 0;
        const fd = feedBy.get(f.id) ?? 0;
        const wt = waterBy.get(f.id) ?? 0;
        return {
          flockId: f.id,
          flockCode: f.flockCode,
          type: f.type,
          houseId: f.houseId,
          recorded: recBy.has(f.id),
          recordId: recBy.get(f.id) ?? null,
          birdsAlive: aliveEnd.get(f.id) ?? 0,
          mortality: m,
          culls: culls.get(f.id) ?? 0,
          feedKg: Math.round(fd * 1e3) / 1e3,
          waterLitres: wt,
          eggsCollected: e,
          eggsBroken: brokenBy.get(f.id) ?? 0,
          henDayPercent: LAYING.has(f.type) ? henDayPercent(e, start) : null,
          mortalityRatePercent: start > 0 ? m / start * 100 : null,
          latestAverageWeightG: latestWeight.get(f.id) ?? null,
          waterToFeedRatio: fd > 0 ? wt / fd : null
        };
      });
      const t = rows.reduce(
        (acc, r) => ({ birdsAlive: acc.birdsAlive + r.birdsAlive, mortality: acc.mortality + r.mortality, culls: acc.culls + r.culls, feedKg: acc.feedKg + r.feedKg, waterLitres: acc.waterLitres + r.waterLitres, eggsCollected: acc.eggsCollected + r.eggsCollected, eggsBroken: acc.eggsBroken + r.eggsBroken }),
        { birdsAlive: 0, mortality: 0, culls: 0, feedKg: 0, waterLitres: 0, eggsCollected: 0, eggsBroken: 0 }
      );
      const layingStart = flocks.filter((f) => LAYING.has(f.type)).reduce((s2, f) => s2 + (aliveStart.get(f.id) ?? 0), 0);
      const allStart = flocks.reduce((s2, f) => s2 + (aliveStart.get(f.id) ?? 0), 0);
      return {
        date,
        totals: { ...t, feedKg: Math.round(t.feedKg * 1e3) / 1e3, henDayPercent: layingStart > 0 ? henDayPercent(t.eggsCollected, layingStart) : null, mortalityRatePercent: allStart > 0 ? t.mortality / allStart * 100 : null },
        flocksTotal: rows.length,
        flocksRecorded: rows.filter((r) => r.recorded).length,
        flocks: rows
      };
    },
    /** Daily totals over a date range, every day present (zeros where nothing was recorded). */
    async trends(ctx, q8) {
      assertCan(ctx, "production.read");
      const days = dateRange(q8.from, q8.to);
      if (days.length > MAX_TREND_DAYS) throw new AppError("VALIDATION_FAILED", `Ask for at most ${MAX_TREND_DAYS} days at a time`);
      const ids = (await flocksFor(ctx, q8)).map((f) => f.id);
      const empty = { mortality: 0, culls: 0, feedKg: 0, waterLitres: 0, eggsCollected: 0, eggsBroken: 0, records: 0 };
      if (!ids.length) return { from: q8.from, to: q8.to, flockIds: [], days: days.map((date) => ({ date, ...empty })), totals: empty };
      const range = { field: "date", from: q8.from, to: q8.to };
      const where = { flockId: ids };
      const [ev, feed, water, eggs, records] = await Promise.all([
        eventSums(ctx.farmId, ids, { from: q8.from, to: q8.to }, ["date", "type"], ["mortality", "cull"]),
        repos.feedConsumption.aggregate(ctx.farmId, { where, range }, ["date"], ["quantityKg"]),
        repos.waterRecords.aggregate(ctx.farmId, { where, range }, ["date"], ["litres"]),
        repos.eggRecords.aggregate(ctx.farmId, { where, range }, ["date"], ["collected", "broken"]),
        repos.dailyRecords.aggregate(ctx.farmId, { where, range }, ["date"], [])
      ]);
      const byType = (type) => netBirds({ rows: ev.rows.filter((r) => r.key["type"] === type), reversals: ev.reversals.filter((r) => r.key["type"] === type) }, (r) => r.key["date"]);
      const deaths = byType("mortality");
      const culls = byType("cull");
      const feedBy = sumMap(feed, "quantityKg", "date");
      const waterBy = sumMap(water, "litres", "date");
      const eggsBy = sumMap(eggs, "collected", "date");
      const brokenBy = sumMap(eggs, "broken", "date");
      const recBy = new Map(records.map((r) => [r.key["date"], r.count]));
      const series = days.map((date) => ({
        date,
        mortality: deaths.get(date) ?? 0,
        culls: culls.get(date) ?? 0,
        feedKg: Math.round((feedBy.get(date) ?? 0) * 1e3) / 1e3,
        waterLitres: waterBy.get(date) ?? 0,
        eggsCollected: eggsBy.get(date) ?? 0,
        eggsBroken: brokenBy.get(date) ?? 0,
        records: recBy.get(date) ?? 0
      }));
      const totals = series.reduce((a, s2) => ({ mortality: a.mortality + s2.mortality, culls: a.culls + s2.culls, feedKg: a.feedKg + s2.feedKg, waterLitres: a.waterLitres + s2.waterLitres, eggsCollected: a.eggsCollected + s2.eggsCollected, eggsBroken: a.eggsBroken + s2.eggsBroken, records: a.records + s2.records }), empty);
      return { from: q8.from, to: q8.to, flockIds: ids, days: series, totals: { ...totals, feedKg: Math.round(totals.feedKg * 1e3) / 1e3 } };
    }
  };
}

// src/services/alert.service.ts
var alertView = ({ farmId: _f, updatedBy: _u, ...a }) => ({
  ...a,
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
  ...a.acknowledgedAt ? { acknowledgedAt: a.acknowledgedAt.toISOString() } : {},
  ...a.resolvedAt ? { resolvedAt: a.resolvedAt.toISOString() } : {}
});
var SEVERITY_RANK = { info: 0, warning: 1, critical: 2 };
function createAlertService(d) {
  const { repos, clock } = d;
  const hooks = {};
  async function raise(ctx, a, tx) {
    const rule = await hooks.ruleFor?.(ctx, a.ruleType, tx);
    if (rule && !rule.enabled) return resolve3(ctx, a.dedupKey, tx);
    if (rule?.flockIds && a.flockId && !rule.flockIds.includes(a.flockId)) return;
    if (rule?.houseIds && a.houseId && !rule.houseIds.includes(a.houseId)) return;
    const severity = rule?.severity ?? a.severity;
    const input = { ...a, severity };
    const existing = (await repos.alerts.find(ctx.farmId, { where: { dedupKey: a.dedupKey }, limit: 1 }, tx))[0];
    const now = clock.now();
    if (existing) {
      if (existing.status === "resolved") {
        const next = await repos.alerts.update(ctx.farmId, existing.id, { status: "open", severity, title: a.title, message: a.message, values: a.values, resolvedAt: void 0, acknowledgedAt: void 0, acknowledgedBy: void 0, updatedAt: now }, void 0, tx);
        if (next) await hooks.onRaised?.(ctx, next, rule, "reopened", tx);
      } else if (existing.severity !== severity || existing.message !== a.message) {
        const next = await repos.alerts.update(ctx.farmId, existing.id, { severity, title: a.title, message: a.message, values: a.values, updatedAt: now }, void 0, tx);
        if (next && SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity]) await hooks.onRaised?.(ctx, next, rule, "escalated", tx);
      }
      return;
    }
    const rec = { id: newId(), farmId: ctx.farmId, status: "open", createdBy: "system", createdAt: now, updatedAt: now, version: 0, ...input };
    await repos.alerts.insert(rec, tx);
    await hooks.onRaised?.(ctx, rec, rule, "new", tx);
  }
  async function resolve3(ctx, dedupKey, tx) {
    const existing = (await repos.alerts.find(ctx.farmId, { where: { dedupKey }, limit: 1 }, tx))[0];
    if (existing && existing.status !== "resolved") await repos.alerts.update(ctx.farmId, existing.id, { status: "resolved", resolvedAt: clock.now(), updatedAt: clock.now() }, void 0, tx);
  }
  async function evaluateInventory(ctx, tx) {
    const farm = await repos.farms.findById(ctx.farmId, tx);
    if (!farm) throw notFound("Farm");
    const today = localDateOf(clock.now(), farm.settings.timezone);
    const items = await repos.inventoryItems.find(ctx.farmId, { where: { active: true } }, tx);
    if (!items.length) return;
    const lots = await repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } }, tx);
    const window = lastNDates(addDays(today, -1), 7);
    for (const item of items) {
      const mine = lots.filter((l) => l.itemId === item.id);
      const open = mine.filter((l) => l.quantityRemaining > 0);
      const inDate = q3(open.filter((l) => !isExpired(l, today)).reduce((t, l) => t + l.quantityRemaining, 0));
      const unit = item.unit;
      const lowKey = `low_stock:${item.id}`;
      let low = item.reorderLevel !== void 0 && inDate <= item.reorderLevel;
      let message = `${item.name}: ${inDate} ${unit} in date stock, at or below the reorder level of ${item.reorderLevel} ${unit}.`;
      let ruleType = item.category === "feed" ? "low_feed_stock" : "low_inventory";
      let values = { quantity: inDate, ...item.reorderLevel !== void 0 ? { reorderLevel: item.reorderLevel } : {} };
      if (item.category === "feed") {
        const use = await repos.feedConsumption.find(ctx.farmId, { where: { feedItemId: item.id }, range: { field: "date", from: window[0], to: window[window.length - 1] } }, tx);
        const avg = averageDailyUseKg(use.map((u) => ({ date: u.date, kg: u.quantityKg })), window);
        const cover = daysOfCover(inDate, avg, item.reorderDays ?? 7);
        if (cover.days !== null) values = { ...values, daysRemaining: cover.days, averageDailyUseKg: q3(avg) };
        if (cover.status === "out" || item.reorderDays !== void 0 && cover.status === "low") {
          low = true;
          message = cover.status === "out" ? `${item.name} is out of stock.` : `${item.name}: about ${cover.days} days of feed left at ${q3(avg)} kg a day (${inDate} kg in stock).`;
        }
      }
      if (low) await raise(ctx, { ruleType, severity: inDate <= 0 ? "critical" : "warning", title: `Low stock: ${item.name}`, message, dedupKey: lowKey, date: today, values }, tx);
      else await resolve3(ctx, lowKey, tx);
      for (const lot of mine) {
        const status = lot.quantityRemaining > 0 ? expiryStatus(lot.expiryDate, today, item.expiryWarningDays, addDays) : null;
        const label = `${item.name}${lot.batchNumber ? ` batch ${lot.batchNumber}` : ""}`;
        if (status === "expired") {
          await raise(ctx, { ruleType: "expired_stock", severity: "critical", title: `Expired: ${label}`, message: `${lot.quantityRemaining} ${unit} of ${label} expired on ${lot.expiryDate}. Do not use it; record it as wastage.`, dedupKey: `expired:${lot.id}`, date: today, values: { quantity: lot.quantityRemaining } }, tx);
          await resolve3(ctx, `expiry_soon:${lot.id}`, tx);
        } else if (status === "expiring") {
          await raise(ctx, { ruleType: "expiry_soon", severity: "warning", title: `Expiring soon: ${label}`, message: `${lot.quantityRemaining} ${unit} of ${label} expires on ${lot.expiryDate}.`, dedupKey: `expiry_soon:${lot.id}`, date: today, values: { quantity: lot.quantityRemaining } }, tx);
        } else {
          await resolve3(ctx, `expiry_soon:${lot.id}`, tx);
          await resolve3(ctx, `expired:${lot.id}`, tx);
        }
      }
    }
  }
  return {
    hooks,
    raise,
    resolve: resolve3,
    evaluateInventory,
    /** Alerts with filters (status, type, rule, severity, flock) and counts of what is open. */
    async list(ctx, q8) {
      assertCan(ctx, "farm.read");
      const where = {};
      if (q8.status) where["status"] = q8.status;
      if (q8.ruleType) where["ruleType"] = q8.ruleType;
      else if (q8.ruleKey) where["ruleType"] = RULE_DEFINITIONS[q8.ruleKey]?.alertTypes ?? [];
      if (q8.severity) where["severity"] = q8.severity;
      if (q8.flockId) where["flockId"] = q8.flockId;
      const items = (await repos.alerts.find(ctx.farmId, { where, sort: [{ field: "updatedAt", dir: -1 }], limit: q8.limit })).map(alertView);
      const open = await repos.alerts.find(ctx.farmId, { where: { status: ["open", "acknowledged"] } });
      return {
        items,
        counts: {
          open: open.filter((a) => a.status === "open").length,
          acknowledged: open.filter((a) => a.status === "acknowledged").length,
          bySeverity: { critical: open.filter((a) => a.severity === "critical").length, warning: open.filter((a) => a.severity === "warning").length, info: open.filter((a) => a.severity === "info").length }
        }
      };
    },
    async acknowledge(ctx, id) {
      assertCan(ctx, "alert.manage");
      const a = await repos.alerts.findById(ctx.farmId, id);
      if (!a) throw notFound("Alert");
      if (a.status === "resolved") throw new AppError("INVALID_STATE_TRANSITION", "This alert is already resolved");
      const next = await repos.alerts.update(ctx.farmId, id, { status: "acknowledged", acknowledgedBy: ctx.userId, acknowledgedAt: clock.now(), updatedAt: clock.now() });
      return alertView(next);
    },
    async evaluate(ctx) {
      assertCan(ctx, "alert.manage");
      await repos.tx.run((tx) => evaluateInventory(ctx, tx));
      return { evaluatedAt: clock.now().toISOString() };
    }
  };
}

// src/services/feed.service.ts
function createFeedService(d) {
  const { repos, clock } = d;
  const E = d.inventory.engine;
  async function recordFeed(ctx, farm, flock, date, line, tx, link = {}) {
    const kind = line.kind ?? "consumption";
    if (kind === "consumption" && !flock) throw new AppError("VALIDATION_FAILED", "Feed eaten must name the flock");
    if (line.feedItemId && line.unitCostPerKg) throw new AppError("VALIDATION_FAILED", "A feed item is costed from its stock; leave out unitCostPerKg");
    E.assertCurrency(line.unitCostPerKg, farm, "unitCostPerKg");
    const id = newId();
    const now = clock.now();
    let allocations;
    let cost = line.unitCostPerKg ? { amountMinor: Math.round(line.unitCostPerKg.amountMinor * line.quantityKg), currency: farm.settings.currency } : void 0;
    if (line.feedItemId) {
      const item = await E.loadItem(ctx, line.feedItemId, tx);
      if (item.category !== "feed") throw new AppError("VALIDATION_FAILED", `${item.name} is not a feed item`);
      if (!item.active) throw new AppError("VALIDATION_FAILED", `${item.name} is inactive`);
      const out = await E.take(
        ctx,
        item,
        line.quantityKg,
        { date, purpose: kind === "wastage" ? "wastage" : "use", type: kind === "wastage" ? "wastage" : "issue", sourceType: "feed_consumption", sourceId: id, ...flock ? { flockId: flock.id, houseId: flock.houseId } : {}, ...line.reason ? { reason: line.reason } : {} },
        farm,
        tx
      );
      allocations = out.allocations;
      cost = { amountMinor: out.costMinor, currency: farm.settings.currency };
    }
    const rec = {
      id,
      farmId: ctx.farmId,
      ...flock ? { flockId: flock.id } : {},
      kind,
      date,
      quantityKg: q3(line.quantityKg),
      ...line.feedItemId ? { feedItemId: line.feedItemId } : {},
      ...link.dailyRecordId ? { dailyRecordId: link.dailyRecordId } : {},
      ...allocations ? { allocations } : {},
      ...cost ? { cost } : {},
      ...line.reason ? { reason: line.reason } : {},
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    await repos.feedConsumption.insert(rec, tx);
    return rec;
  }
  async function removeFeed(ctx, farm, rec, tx) {
    if (rec.allocations?.length) await E.reverseSource(ctx, rec.id, "Feed entry removed", farm, tx);
    const now = clock.now();
    await repos.feedConsumption.update(ctx.farmId, rec.id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, void 0, tx);
  }
  const feedView = ({ farmId: _f, deletedAt: _d, deletedBy: _db, updatedBy: _u, ...r }) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
  return {
    recordFeed,
    removeFeed,
    /** POST /feed/consumption — feed eaten by a flock, or wasted (in a flock's house or in the store). */
    async consume(ctx, r) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        let flock = null;
        if (r.flockId) {
          flock = await d.flocks.ledger.loadFlock(ctx, r.flockId, tx);
          d.flocks.ledger.assertStatus(flock, ["active"], "record feed");
          d.flocks.ledger.assertDate(r.date, farm, flock);
        } else if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        const rec = await recordFeed(ctx, farm, flock, r.date, r, tx);
        await d.audit.record(ctx, { action: `feed.${rec.kind}`, entity: "feed_consumption", entityId: rec.id, after: { flockId: rec.flockId, quantityKg: rec.quantityKg, costMinor: rec.cost?.amountMinor } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "feed_consumption", entityId: rec.id, op: "upsert", version: 0 }, tx);
        return feedView(rec);
      });
    },
    /** DELETE /feed/consumption/:id — entries made through a daily record are changed by editing the record. */
    async removeEntry(ctx, id) {
      assertCan(ctx, "inventory.issue");
      await repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const rec = await repos.feedConsumption.findById(ctx.farmId, id, tx);
        if (!rec) throw notFound("Feed entry");
        if (rec.dailyRecordId) throw new AppError("INVALID_STATE_TRANSITION", "This feed entry belongs to a daily record; edit the daily record instead");
        await removeFeed(ctx, farm, rec, tx);
        await d.audit.record(ctx, { action: "feed.removed", entity: "feed_consumption", entityId: id, before: { quantityKg: rec.quantityKg, flockId: rec.flockId } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "feed_consumption", entityId: id, op: "delete", version: rec.version + 1 }, tx);
      });
    },
    async list(ctx, q8) {
      assertCan(ctx, "inventory.read");
      const where = {};
      if (q8.flockId) where["flockId"] = q8.flockId;
      if (q8.feedItemId) where["feedItemId"] = q8.feedItemId;
      if (q8.kind) where["kind"] = q8.kind;
      const rows = await repos.feedConsumption.find(ctx.farmId, { where, range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} }, sort: [{ field: "date", dir: -1 }], limit: q8.limit });
      return rows.map(feedView);
    },
    /**
     * Feed stock per item: kg in date, value, average daily use over the last 7 complete days (eaten and wasted,
     * averaged over days with entries) and days of feed remaining. Plus the farm total.
     */
    async stock(ctx) {
      assertCan(ctx, "inventory.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const items = await repos.inventoryItems.find(ctx.farmId, { where: { category: "feed", active: true }, sort: [{ field: "name", dir: 1 }] });
      const window = lastNDates(addDays(today, -1), 7);
      const [lots, use] = items.length ? await Promise.all([
        repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } }),
        repos.feedConsumption.find(ctx.farmId, { where: { feedItemId: items.map((i) => i.id) }, range: { field: "date", from: window[0], to: window[window.length - 1] } })
      ]) : [[], []];
      const rows = items.map((item) => {
        const open = lots.filter((l) => l.itemId === item.id && l.quantityRemaining > 0);
        const inDate = q3(open.filter((l) => !isExpired(l, today)).reduce((t, l) => t + l.quantityRemaining, 0));
        const avg = averageDailyUseKg(use.filter((u) => u.feedItemId === item.id).map((u) => ({ date: u.date, kg: u.quantityKg })), window);
        const cover = daysOfCover(inDate, avg, item.reorderDays ?? 7);
        return {
          itemId: item.id,
          name: item.name,
          stage: item.feed?.stage,
          quantityKg: inDate,
          expiredKg: q3(open.filter((l) => isExpired(l, today)).reduce((t, l) => t + l.quantityRemaining, 0)),
          valueMinor: item.stock?.valueMinor ?? 0,
          averageDailyUseKg: avg === null ? null : q3(avg),
          daysRemaining: cover.days,
          status: cover.status,
          reorderDays: item.reorderDays ?? 7,
          // Farmers count feed in bags: the apps enter feed in bags of this size when it is set.
          bagSizeKg: item.feed?.bagSizeKg ?? null
        };
      });
      const totalKg = q3(rows.reduce((t, r) => t + r.quantityKg, 0));
      const totalUse = rows.reduce((t, r) => t + (r.averageDailyUseKg ?? 0), 0);
      return {
        date: today,
        currency: farm.settings.currency,
        items: rows,
        totals: { quantityKg: totalKg, valueMinor: rows.reduce((t, r) => t + r.valueMinor, 0), averageDailyUseKg: q3(totalUse), daysRemaining: totalUse > 0 ? Math.floor(totalKg / totalUse) : null }
      };
    },
    /** Feed performance per flock: feed per bird, per kg gain, FCR, wastage, feed cost per bird and per egg. */
    async analytics(ctx, q8) {
      assertCan(ctx, "production.read");
      const flocks = q8.flockId ? [await d.flocks.ledger.loadFlock(ctx, q8.flockId)] : await repos.flocks.find(ctx.farmId, { where: { status: q8.status ?? "active" } });
      const rows = [];
      for (const f of flocks) {
        const m = await d.flocks.metrics(ctx, f.id, q8.asOf ? { asOf: q8.asOf } : {});
        rows.push({
          flockId: f.id,
          flockCode: f.flockCode,
          type: f.type,
          birdsIn: m.birdsIn,
          currentBirdCount: m.currentBirdCount,
          feedConsumedKg: m.feedConsumedKg,
          feedWastedKg: m.feedWastedKg,
          feedPerBirdKg: m.feedPerBirdKg,
          feedPerKgGainKg: m.feedPerKgGainKg,
          fcr: m.fcr,
          fcrWarning: m.fcrWarning,
          feedCostMinor: m.feedCostMinor,
          feedCostPerBirdMinor: m.feedCostPerBirdMinor,
          eggsCollected: m.eggsCollected,
          feedCostPerEggMinor: m.feedCostPerEggMinor,
          costsComplete: m.costsComplete
        });
      }
      return { flocks: rows, stock: await this.stock(ctx) };
    },
    async water(ctx, q8) {
      assertCan(ctx, "production.read");
      const rows = await repos.waterRecords.find(ctx.farmId, {
        ...q8.flockId ? { where: { flockId: q8.flockId } } : {},
        ...q8.abnormal ? { exists: { flags: true } } : {},
        range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} },
        sort: [{ field: "date", dir: -1 }],
        limit: q8.limit
      });
      return rows.filter((r) => !q8.abnormal || (r.flags?.length ?? 0) > 0).map(({ farmId: _f, deletedAt: _d, deletedBy: _db, updatedBy: _u, ...r }) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
    }
  };
}

// src/services/inventory.service.ts
var toStockLot = (l) => ({
  id: l.id,
  receivedDate: l.receivedDate,
  ...l.expiryDate ? { expiryDate: l.expiryDate } : {},
  quantityRemaining: l.quantityRemaining,
  unitCostMinor: l.unitCost.amountMinor
});
function createInventoryService(d) {
  const { repos, clock } = d;
  const hooks = { afterPurchase: [] };
  async function farmOf(ctx, tx) {
    const f = await repos.farms.findById(ctx.farmId, tx);
    if (!f) throw notFound("Farm");
    return f;
  }
  const todayOf = (farm) => localDateOf(clock.now(), farm.settings.timezone);
  async function loadItem(ctx, id, tx) {
    const item = await repos.inventoryItems.findById(ctx.farmId, id, tx);
    if (!item) throw notFound("Inventory item");
    return item;
  }
  const lotsOf = (ctx, itemId, tx) => repos.inventoryLots.find(ctx.farmId, { where: { itemId }, sort: [{ field: "receivedDate", dir: 1 }] }, tx);
  async function refreshItem(ctx, item, farm, tx) {
    const lots = await lotsOf(ctx, item.id, tx);
    const t = stockTotals(lots.map(toStockLot));
    const next = await repos.inventoryItems.update(
      ctx.farmId,
      item.id,
      { stock: { quantity: t.quantity, valueMinor: t.valueMinor, currency: farm.settings.currency, asOf: todayOf(farm) }, updatedAt: clock.now() },
      { expectedVersion: item.version },
      tx
    );
    if (!next) throw new AppError("VERSION_CONFLICT", `${item.name} stock changed at the same time elsewhere. Try again.`);
    return next;
  }
  function assertDate(date, farm) {
    if (date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${date} is in the future for this farm`);
  }
  function assertCurrency(m, farm, field) {
    if (m && m.currency !== farm.settings.currency) throw new AppError("VALIDATION_FAILED", `${field} must be in the farm currency (${farm.settings.currency})`);
  }
  async function receive(ctx, item, r, sourceType, farm, tx, reason) {
    assertDate(r.date, farm);
    assertCurrency(r.unitCost, farm, "unitCost");
    if (r.expiryDate && r.expiryDate < r.date) throw new AppError("VALIDATION_FAILED", "Expiry date is before the date received");
    const now = clock.now();
    const lot = {
      id: newId(),
      farmId: ctx.farmId,
      itemId: item.id,
      receivedDate: r.date,
      ...r.supplier ?? item.defaultSupplier ? { supplier: r.supplier ?? item.defaultSupplier } : {},
      ...r.batchNumber ? { batchNumber: r.batchNumber } : {},
      ...r.invoiceNumber ? { invoiceNumber: r.invoiceNumber } : {},
      ...r.expiryDate ? { expiryDate: r.expiryDate } : {},
      ...r.storageLocation ?? item.defaultStorageLocation ? { storageLocation: r.storageLocation ?? item.defaultStorageLocation } : {},
      quantityReceived: q3(r.quantity),
      quantityRemaining: q3(r.quantity),
      unitCost: r.unitCost,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    const txn = {
      id: newId(),
      farmId: ctx.farmId,
      itemId: item.id,
      lotId: lot.id,
      type: sourceType === "purchase" ? "receipt" : "adjustment",
      date: r.date,
      quantityDelta: lot.quantityReceived,
      valueMinor: Math.round(lot.quantityReceived * r.unitCost.amountMinor),
      currency: farm.settings.currency,
      sourceType,
      sourceId: lot.id,
      ...reason ? { reason } : {},
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now
    };
    await repos.inventoryLots.insert(lot, tx);
    await repos.inventoryTransactions.insert(txn, tx);
    const next = await refreshItem(ctx, item, farm, tx);
    await d.audit.record(ctx, { action: sourceType === "purchase" ? "inventory.received" : "inventory.count_added", entity: "inventory_item", entityId: item.id, after: { quantity: lot.quantityReceived, lotId: lot.id, expiryDate: lot.expiryDate } }, tx);
    await d.onStockChanged?.(ctx, tx);
    return { lot, transaction: txn, item: next };
  }
  async function take(ctx, item, quantity, o, farm, tx) {
    assertDate(o.date, farm);
    const lots = await lotsOf(ctx, item.id, tx);
    const allocations = allocate(lots.map(toStockLot), q3(quantity), o.date, o.purpose);
    const now = clock.now();
    const byId = new Map(lots.map((l) => [l.id, l]));
    for (const a of allocations) {
      const lot = byId.get(a.lotId);
      await repos.inventoryLots.update(ctx.farmId, lot.id, { quantityRemaining: q3(lot.quantityRemaining - a.quantity), updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: lot.version }, tx);
    }
    await repos.inventoryTransactions.insertMany(
      allocations.map((a) => ({
        id: newId(),
        farmId: ctx.farmId,
        itemId: item.id,
        lotId: a.lotId,
        type: o.type,
        date: o.date,
        quantityDelta: -a.quantity,
        valueMinor: -a.costMinor,
        currency: farm.settings.currency,
        sourceType: o.sourceType,
        ...o.sourceId ? { sourceId: o.sourceId } : {},
        ...o.flockId ? { flockId: o.flockId } : {},
        ...o.houseId ? { houseId: o.houseId } : {},
        ...o.reason ? { reason: o.reason } : {},
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now
      })),
      tx
    );
    const next = await refreshItem(ctx, item, farm, tx);
    await d.onStockChanged?.(ctx, tx);
    return { allocations, costMinor: allocations.reduce((t, a) => t + a.costMinor, 0), item: next };
  }
  async function reverseSource(ctx, sourceId, reason, farm, tx) {
    const txns = await repos.inventoryTransactions.find(ctx.farmId, { where: { sourceId } }, tx);
    const reversed = new Set(txns.filter((t) => t.reversalOf).map((t) => t.reversalOf));
    const live = txns.filter((t) => !t.reversalOf && !reversed.has(t.id));
    if (!live.length) return;
    const now = clock.now();
    for (const t of live) {
      const lot = await repos.inventoryLots.findById(ctx.farmId, t.lotId, tx);
      if (lot) await repos.inventoryLots.update(ctx.farmId, lot.id, { quantityRemaining: q3(lot.quantityRemaining - t.quantityDelta), updatedAt: now }, { expectedVersion: lot.version }, tx);
    }
    await repos.inventoryTransactions.insertMany(
      live.map((t) => ({
        id: newId(),
        farmId: ctx.farmId,
        itemId: t.itemId,
        lotId: t.lotId,
        type: "reversal",
        date: t.date,
        quantityDelta: -t.quantityDelta,
        valueMinor: -t.valueMinor,
        currency: t.currency,
        sourceType: t.sourceType,
        sourceId,
        reason,
        reversalOf: t.id,
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now
      })),
      tx
    );
    for (const itemId of new Set(live.map((t) => t.itemId))) await refreshItem(ctx, await loadItem(ctx, itemId, tx), farm, tx);
    await d.onStockChanged?.(ctx, tx);
  }
  function itemView(item, lots, today) {
    const open = lots.filter((l) => l.quantityRemaining > 0);
    const inDate = q3(open.filter((l) => !isExpired(toStockLot(l), today)).reduce((t, l) => t + l.quantityRemaining, 0));
    const expired = q3(open.filter((l) => isExpired(toStockLot(l), today)).reduce((t, l) => t + l.quantityRemaining, 0));
    const expiring = open.filter((l) => expiryStatus(l.expiryDate, today, item.expiryWarningDays, addDays) === "expiring");
    const { farmId: _f, deletedAt: _d, deletedBy: _db, createdBy: _c, updatedBy: _u, ...rest } = item;
    return {
      ...rest,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      quantity: item.stock?.quantity ?? 0,
      valueMinor: item.stock?.valueMinor ?? 0,
      quantityInDate: inDate,
      quantityExpired: expired,
      lowStock: item.reorderLevel !== void 0 && inDate <= item.reorderLevel,
      lotsExpiringSoon: expiring.length,
      nextExpiryDate: open.filter((l) => l.expiryDate && l.expiryDate >= today).map((l) => l.expiryDate).sort()[0] ?? null
    };
  }
  const lotView = (l, item, today) => ({
    id: l.id,
    itemId: l.itemId,
    itemName: item.name,
    receivedDate: l.receivedDate,
    supplier: l.supplier,
    batchNumber: l.batchNumber,
    invoiceNumber: l.invoiceNumber,
    expiryDate: l.expiryDate,
    storageLocation: l.storageLocation,
    quantityReceived: l.quantityReceived,
    quantityRemaining: l.quantityRemaining,
    unitCost: l.unitCost,
    expiry: expiryStatus(l.expiryDate, today, item.expiryWarningDays, addDays)
  });
  async function eggStock(ctx, tx) {
    const rows = await repos.eggInventory.aggregate(ctx.farmId, {}, ["grade"], ["quantityDelta"]);
    void tx;
    const byGrade = {};
    for (const r of rows) byGrade[r.key["grade"] ?? "ungraded"] = r.sums["quantityDelta"] ?? 0;
    return { total: Object.values(byGrade).reduce((t, n) => t + n, 0), byGrade };
  }
  return {
    engine: { farmOf, todayOf, loadItem, take, receive, reverseSource, assertCurrency },
    hooks,
    async createItem(ctx, input) {
      assertCan(ctx, "inventory.manage");
      if (input.category === "feed" && input.unit !== "kg") throw new AppError("VALIDATION_FAILED", "Feed is stocked in kg");
      if (input.category === "feed" && !input.feed) throw new AppError("VALIDATION_FAILED", "Give the feed stage for a feed item");
      if (input.category !== "feed" && (input.feed || input.reorderDays !== void 0)) throw new AppError("VALIDATION_FAILED", "Feed details and reorderDays apply to feed items only");
      const farm = await farmOf(ctx);
      const now = clock.now();
      const { id, ...fields } = input;
      const item = {
        id: id ?? newId(),
        farmId: ctx.farmId,
        ...fields,
        expiryWarningDays: input.expiryWarningDays ?? 30,
        active: true,
        stock: { quantity: 0, valueMinor: 0, currency: farm.settings.currency, asOf: todayOf(farm) },
        createdBy: ctx.userId,
        createdAt: now,
        updatedAt: now,
        version: 0
      };
      await repos.tx.run(async (tx) => {
        await repos.inventoryItems.insert(item, tx).catch(duplicate(`An item named "${item.name}"`));
        await d.audit.record(ctx, { action: "inventory.item_created", entity: "inventory_item", entityId: item.id, after: { name: item.name, category: item.category } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "inventory_item", entityId: item.id, op: "upsert", version: 0 }, tx);
      });
      return itemView(item, [], todayOf(farm));
    },
    async updateItem(ctx, id, input) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const cur = await loadItem(ctx, id, tx);
        if (cur.version !== input.version) throw new AppError("VERSION_CONFLICT", "This item was changed by someone else", { serverVersion: cur.version });
        if (cur.category !== "feed" && (input.feed || input.reorderDays !== void 0)) throw new AppError("VALIDATION_FAILED", "Feed details and reorderDays apply to feed items only");
        const { version, ...fields } = input;
        const next = await repos.inventoryItems.update(ctx.farmId, id, { ...fields, feed: cur.category === "feed" ? input.feed ?? cur.feed : void 0, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version }, tx).catch(duplicate(`An item named "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This item was changed by someone else");
        await d.audit.record(ctx, { action: "inventory.item_updated", entity: "inventory_item", entityId: id, before: cur, after: next }, tx);
        await d.onStockChanged?.(ctx, tx);
        return itemView(next, await lotsOf(ctx, id, tx), todayOf(farm));
      });
    },
    async listItems(ctx, q8) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const where = {};
      if (q8.category) where["category"] = q8.category;
      if (!q8.includeInactive) where["active"] = true;
      const items = await repos.inventoryItems.find(ctx.farmId, { where, sort: [{ field: "name", dir: 1 }] });
      const lots = items.length ? await repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } }) : [];
      const views = items.map((i) => itemView(i, lots.filter((l) => l.itemId === i.id), today));
      return q8.lowStock ? views.filter((v) => v.lowStock) : views;
    },
    async getItem(ctx, id) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const item = await loadItem(ctx, id);
      const lots = await lotsOf(ctx, id);
      return { ...itemView(item, lots, today), lots: lots.filter((l) => l.quantityRemaining > 0).map((l) => lotView(l, item, today)) };
    },
    /** A purchase: creates a lot (batch, expiry, location, unit cost) and a receipt in the ledger. */
    async receivePurchase(ctx, itemId, r) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        if (!item.active) throw new AppError("VALIDATION_FAILED", `${item.name} is inactive`);
        const supplier = r.supplierId ? await repos.suppliers.findById(ctx.farmId, r.supplierId, tx) : null;
        if (r.supplierId && !supplier) throw notFound("Supplier");
        const { supplierId: _s, ...rest } = r;
        const out = await receive(ctx, item, { ...rest, ...supplier && !r.supplier ? { supplier: supplier.name } : {} }, "purchase", farm, tx);
        for (const h of hooks.afterPurchase) await h(ctx, item, out.lot, r.supplierId, tx);
        return lotView(out.lot, out.item, todayOf(farm));
      });
    },
    /** Use stock (e.g. a medicine dose, litter for a house). FEFO; expired stock is never used. */
    async issue(ctx, itemId, r) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        if (item.category === "feed" && r.flockId) throw new AppError("VALIDATION_FAILED", "Record feed eaten by a flock as feed consumption, so it counts in FCR");
        if (r.flockId && !await repos.flocks.findById(ctx.farmId, r.flockId, tx)) throw notFound("Flock");
        if (r.houseId && !await repos.houses.findById(ctx.farmId, r.houseId, tx)) throw notFound("House");
        const sourceId = newId();
        const out = await take(ctx, item, r.quantity, { date: r.date, purpose: "use", type: "issue", sourceType: "manual", sourceId, ...r.flockId ? { flockId: r.flockId } : {}, ...r.houseId ? { houseId: r.houseId } : {}, ...r.reason ? { reason: r.reason } : {} }, farm, tx);
        await d.audit.record(ctx, { action: "inventory.issued", entity: "inventory_item", entityId: item.id, after: { quantity: r.quantity, costMinor: out.costMinor } }, tx);
        return { sourceId, quantity: q3(r.quantity), cost: { amountMinor: out.costMinor, currency: farm.settings.currency }, allocations: out.allocations, remaining: out.item.stock?.quantity ?? 0 };
      });
    },
    /** Stock lost, spoiled or expired. Expired lots are written off first. */
    async wastage(ctx, itemId, r) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        const sourceId = newId();
        const out = await take(ctx, item, r.quantity, { date: r.date, purpose: "wastage", type: "wastage", sourceType: "manual", sourceId, reason: r.reason }, farm, tx);
        await d.audit.record(ctx, { action: "inventory.wasted", entity: "inventory_item", entityId: item.id, after: { quantity: r.quantity, costMinor: out.costMinor, reason: r.reason } }, tx);
        return { sourceId, quantity: q3(r.quantity), cost: { amountMinor: out.costMinor, currency: farm.settings.currency }, allocations: out.allocations, remaining: out.item.stock?.quantity ?? 0 };
      });
    },
    /**
     * Stock count: the counted quantity replaces the book quantity. A shortfall is removed (oldest expiry first, as
     * an adjustment); a surplus becomes a new lot valued at the current average cost.
     */
    async stockCount(ctx, itemId, r) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const item = await loadItem(ctx, itemId, tx);
        const lots = await lotsOf(ctx, itemId, tx);
        const book = stockTotals(lots.map(toStockLot)).quantity;
        const diff = q3(r.countedQuantity - book);
        const reason = r.reason ?? "Stock count";
        if (diff < 0) await take(ctx, item, -diff, { date: r.date, purpose: "wastage", type: "adjustment", sourceType: "stock_count", sourceId: newId(), reason }, farm, tx);
        if (diff > 0) {
          await receive(ctx, item, { date: r.date, quantity: diff, unitCost: { amountMinor: Math.round(averageUnitCost(lots.map(toStockLot))), currency: farm.settings.currency } }, "stock_count", farm, tx, reason);
        }
        await d.audit.record(ctx, { action: "inventory.counted", entity: "inventory_item", entityId: item.id, after: { book, counted: r.countedQuantity, difference: diff } }, tx);
        return { bookQuantity: book, countedQuantity: q3(r.countedQuantity), difference: diff };
      });
    },
    async transactions(ctx, itemId, q8) {
      assertCan(ctx, "inventory.read");
      await loadItem(ctx, itemId);
      const rows = await repos.inventoryTransactions.find(ctx.farmId, {
        where: { itemId },
        range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} },
        sort: [{ field: "date", dir: -1 }, { field: "createdAt", dir: -1 }],
        limit: q8.limit
      });
      return rows.map(({ farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, ...t }) => ({ ...t, createdAt: createdAt.toISOString() }));
    },
    /** Lots with stock, optionally only those expired or expiring within each item's warning window. */
    async lots(ctx, q8) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const items = await repos.inventoryItems.find(ctx.farmId, q8.category ? { where: { category: q8.category } } : {});
      const byId = new Map(items.map((i) => [i.id, i]));
      const lots = (await repos.inventoryLots.find(ctx.farmId, { where: { itemId: [...byId.keys()] }, sort: [{ field: "receivedDate", dir: 1 }] })).filter((l) => l.quantityRemaining > 0);
      const views = lots.map((l) => lotView(l, byId.get(l.itemId), today));
      return (q8.expiring ? views.filter((v) => v.expiry === "expired" || v.expiry === "expiring") : views).sort((a, b) => (a.expiryDate ?? "9999") < (b.expiryDate ?? "9999") ? -1 : 1);
    },
    /** Every kind of stock on the farm in one view: catalog categories, eggs by grade and chick lots. */
    async overview(ctx) {
      assertCan(ctx, "inventory.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const items = await repos.inventoryItems.find(ctx.farmId, { where: { active: true } });
      const lots = items.length ? await repos.inventoryLots.find(ctx.farmId, { where: { itemId: items.map((i) => i.id) } }) : [];
      const views = items.map((i) => itemView(i, lots.filter((l) => l.itemId === i.id), today));
      const categories = {};
      for (const v of views) {
        const c = categories[v.category] ??= { items: 0, valueMinor: 0, lowStock: 0, lotsExpiringSoon: 0, quantityExpired: 0 };
        c.items++;
        c.valueMinor += v.valueMinor;
        c.lowStock += v.lowStock ? 1 : 0;
        c.lotsExpiringSoon += v.lotsExpiringSoon;
        c.quantityExpired = q3(c.quantityExpired + v.quantityExpired);
      }
      const chickLots = await repos.chickLots.find(ctx.farmId, { where: { status: "available" } });
      return {
        date: today,
        currency: farm.settings.currency,
        totalValueMinor: views.reduce((t, v) => t + v.valueMinor, 0),
        categories,
        eggs: await eggStock(ctx),
        chicks: { available: chickLots.reduce((t, l) => t + l.remaining, 0), lots: chickLots.length }
      };
    },
    eggStock,
    /** Manual egg movements: eggs used on the farm, spoiled, or a count correction. Sales post through orders. */
    async eggMovement(ctx, r) {
      assertCan(ctx, "inventory.issue");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertDate(r.date, farm);
        const delta = r.type === "adjustment" ? r.quantity : -Math.abs(r.quantity);
        if (delta < 0) {
          const stock = await eggStock(ctx, tx);
          const available = r.grade ? stock.byGrade[r.grade] ?? 0 : stock.total;
          if (-delta > available) throw new AppError("INSUFFICIENT_STOCK", `Only ${available} ${r.grade ?? ""} eggs in stock`.replace("  ", " "), { available, requested: -delta });
        }
        const now = clock.now();
        const rec = { id: newId(), farmId: ctx.farmId, date: r.date, type: r.type, ...r.grade ? { grade: r.grade } : {}, quantityDelta: delta, sourceType: "manual", ...r.reason ? { note: r.reason } : {}, createdBy: ctx.userId, createdAt: now, updatedAt: now };
        await repos.eggInventory.insert(rec, tx);
        await d.audit.record(ctx, { action: "eggs.moved", entity: "egg_inventory", entityId: rec.id, after: { type: r.type, quantityDelta: delta, grade: r.grade } }, tx);
        return { id: rec.id, quantityDelta: delta, stock: await eggStock(ctx, tx) };
      });
    },
    async receiveChicks(ctx, r) {
      assertCan(ctx, "inventory.manage");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertDate(r.date, farm);
        assertCurrency(r.unitCost, farm, "unitCost");
        const now = clock.now();
        const lot = {
          id: newId(),
          farmId: ctx.farmId,
          source: "purchased",
          species: r.species,
          ...r.breed ? { breed: r.breed } : {},
          ...r.supplier ? { supplier: r.supplier } : {},
          hatchDate: r.hatchDate ?? r.date,
          quantity: r.quantity,
          remaining: r.quantity,
          status: "available",
          ...r.unitCost ? { unitCost: r.unitCost } : {},
          ...r.notes ? { notes: r.notes } : {},
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.chickLots.insert(lot, tx);
        await d.audit.record(ctx, { action: "chicks.received", entity: "chick_lot", entityId: lot.id, after: { quantity: lot.quantity } }, tx);
        return lot;
      });
    },
    async chickLots(ctx, q8) {
      assertCan(ctx, "inventory.read");
      return repos.chickLots.find(ctx.farmId, { ...q8.status ? { where: { status: q8.status } } : {}, sort: [{ field: "hatchDate", dir: -1 }] });
    }
  };
}

// src/services/health.service.ts
var MEDICAL_CATEGORIES = /* @__PURE__ */ new Set(["medicine", "vaccine"]);
function createHealthService(d) {
  const { repos, clock } = d;
  const hooks = { onCost: [] };
  const E = d.inventory.engine;
  const L = d.flocks.ledger;
  const strip = ({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  async function windowsFor(ctx, flockId, tx) {
    const records = await repos.healthRecords.find(ctx.farmId, { where: { flockId }, exists: { treatments: true } }, tx);
    const out = [];
    for (const r of records) {
      for (const t of r.treatments ?? []) {
        if (t.withdrawalMeatUntil) out.push({ until: t.withdrawalMeatUntil, kind: "meat", medicineName: t.medicineName, recordId: r.id });
        if (t.withdrawalEggsUntil) out.push({ until: t.withdrawalEggsUntil, kind: "eggs", medicineName: t.medicineName, recordId: r.id });
      }
    }
    return out;
  }
  async function assertBirdsMayLeave(ctx, flock, date, purpose, tx) {
    const w = activeWithdrawal(await windowsFor(ctx, flock.id, tx), date, "meat");
    if (!w) return;
    throw new AppError(
      "WITHDRAWAL_ACTIVE",
      purpose === "sale" ? `${flock.flockCode} is in a meat withdrawal period for ${w.medicineName} until ${w.until} (inclusive). Birds cannot be sold before ${addDays(w.until, 1)}.` : `${flock.flockCode} is in a meat withdrawal period for ${w.medicineName} until ${w.until}. Birds cannot move into another flock until it ends.`,
      { until: w.until, medicine: w.medicineName, recordId: w.recordId }
    );
  }
  async function refreshWithheldEggs(ctx, flockId, tx) {
    const windows = (await windowsFor(ctx, flockId, tx)).filter((w) => w.kind === "eggs");
    const starts = /* @__PURE__ */ new Map();
    for (const r of await repos.healthRecords.find(ctx.farmId, { where: { flockId }, exists: { treatments: true } }, tx)) {
      for (const t of r.treatments ?? []) if (t.withdrawalEggsUntil) starts.set(`${r.id}:${t.withdrawalEggsUntil}`, t.startDate);
    }
    const eggs = await repos.eggRecords.find(ctx.farmId, { where: { flockId } }, tx);
    for (const e of eggs) {
      const covering = windows.filter((w) => (starts.get(`${w.recordId}:${w.until}`) ?? w.until) <= e.date && e.date <= w.until).map((w) => w.until).sort().reverse()[0];
      if (covering !== e.withheldUntil) await repos.eggRecords.update(ctx.farmId, e.id, { withheldUntil: covering, updatedAt: clock.now() }, void 0, tx);
    }
  }
  async function buildTreatments(ctx, farm, flock, recordId, input, tx) {
    const out = [];
    for (const t of input) {
      let med = null;
      if (t.medicineId) {
        med = await repos.medicines.findById(ctx.farmId, t.medicineId, tx);
        if (!med) throw notFound("Medicine");
      }
      const endDate = treatmentEndDate(t.startDate, t.durationDays);
      const meatDays = t.withdrawalMeatDays ?? med?.withdrawalMeatDays;
      const eggDays = t.withdrawalEggDays ?? med?.withdrawalEggDays;
      const overridden = t.withdrawalMeatDays !== void 0 || t.withdrawalEggDays !== void 0;
      const source = t.withdrawalSource ?? (overridden ? void 0 : med?.withdrawalSource);
      let stockCostMinor;
      if (t.inventoryItemId) {
        const item = await E.loadItem(ctx, t.inventoryItemId, tx);
        if (!MEDICAL_CATEGORIES.has(item.category)) throw new AppError("VALIDATION_FAILED", `${item.name} is not a medicine or vaccine`);
        const taken = await E.take(ctx, item, t.quantityUsed, { date: t.startDate, purpose: "use", type: "issue", sourceType: "health_record", sourceId: recordId, ...flock ? { flockId: flock.id, houseId: flock.houseId } : {}, reason: `Treatment: ${med?.name ?? t.medicineName}` }, farm, tx);
        stockCostMinor = taken.costMinor;
      }
      const meatUntil = withdrawalUntil(endDate, meatDays);
      const eggsUntil = withdrawalUntil(endDate, eggDays);
      out.push({
        id: newId(),
        ...med ? { medicineId: med.id } : {},
        medicineName: med?.name ?? t.medicineName,
        ...t.inventoryItemId ? { inventoryItemId: t.inventoryItemId, quantityUsed: t.quantityUsed } : {},
        ...t.dose ? { dose: t.dose } : {},
        ...t.route ?? med?.defaultRoute ? { route: t.route ?? med?.defaultRoute } : {},
        ...t.frequency ? { frequency: t.frequency } : {},
        startDate: t.startDate,
        durationDays: t.durationDays,
        endDate,
        ...meatDays !== void 0 ? { withdrawalMeatDays: meatDays } : {},
        ...eggDays !== void 0 ? { withdrawalEggDays: eggDays } : {},
        ...source ? { withdrawalSource: source } : {},
        ...meatUntil ? { withdrawalMeatUntil: meatUntil } : {},
        ...eggsUntil ? { withdrawalEggsUntil: eggsUntil } : {},
        ...t.prescribedBy ? { prescribedBy: t.prescribedBy } : {},
        ...t.prescriptionReference ? { prescriptionReference: t.prescriptionReference } : {},
        ...stockCostMinor !== void 0 ? { stockCostMinor } : {}
      });
    }
    return out;
  }
  async function validateRefs(ctx, farm, input, tx) {
    if (input.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${input.date} is in the future for this farm`);
    if (input.followUpDate && input.followUpDate < input.date) throw new AppError("VALIDATION_FAILED", "The follow-up date is before the record date");
    let flock = null;
    if (input.flockId) {
      flock = await L.loadFlock(ctx, input.flockId, tx);
      if (input.affectedBirds !== void 0 && input.affectedBirds > (flock.population?.alive ?? 0) + (input.deadBirds ?? 0)) {
        throw new AppError("VALIDATION_FAILED", `More birds affected (${input.affectedBirds}) than are in ${flock.flockCode}`);
      }
    }
    if (input.houseId && !await repos.houses.findById(ctx.farmId, input.houseId, tx)) throw notFound("House");
    for (const a of input.attachments) if (!await repos.mediaAssets.findById(ctx.farmId, a.assetId, tx)) throw new AppError("NOT_FOUND", `Attachment ${a.assetId} not found on this farm`);
    for (const t of input.treatments) if (t.startDate > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", "A treatment cannot start in the future; schedule a follow-up instead");
    if (input.treatments.length && !flock && !input.houseId) throw new AppError("VALIDATION_FAILED", "A treatment must name the flock or house treated");
    E.assertCurrency(input.cost, farm, "cost");
    return flock;
  }
  async function afterWrite(ctx, rec, farm, tx) {
    if (rec.flockId) {
      await refreshWithheldEggs(ctx, rec.flockId, tx);
      const windows = await windowsFor(ctx, rec.flockId, tx);
      const today = E.todayOf(farm);
      const meat = activeWithdrawal(windows, today, "meat");
      const eggs = activeWithdrawal(windows, today, "eggs");
      const key = `withdrawal:${rec.flockId}`;
      if (meat || eggs) {
        const flock = await L.loadFlock(ctx, rec.flockId, tx);
        const parts = [meat ? `birds may not be sold until after ${meat.until} (${meat.medicineName})` : null, eggs ? `eggs may not be sold until after ${eggs.until} (${eggs.medicineName})` : null].filter(Boolean);
        await d.alerts.raise(ctx, { ruleType: "withdrawal_active", severity: "warning", title: `Withdrawal period: ${flock.flockCode}`, message: `${flock.flockCode}: ${parts.join("; ")}.`, dedupKey: key, date: today, flockId: rec.flockId }, tx);
      } else await d.alerts.resolve(ctx, key, tx);
    }
    await d.sync.recordChange(ctx.farmId, { entity: "health_record", entityId: rec.id, op: "upsert", version: rec.version }, tx);
  }
  const treatmentKey = (ts) => JSON.stringify(ts.map((t) => [t.medicineId ?? t.medicineName, t.inventoryItemId ?? "", t.quantityUsed ?? "", t.startDate, t.durationDays, t.withdrawalMeatDays ?? "", t.withdrawalEggDays ?? ""]));
  function recordFields(input) {
    return {
      type: input.type,
      date: input.date,
      flockId: input.flockId,
      houseId: input.houseId,
      title: input.title,
      symptoms: input.symptoms?.map((s2) => s2.toLowerCase()),
      observedSigns: input.observedSigns,
      affectedBirds: input.affectedBirds,
      deadBirds: input.deadBirds,
      vetName: input.vetName,
      assessment: input.assessment,
      lab: input.lab,
      cost: input.cost,
      followUpDate: input.followUpDate,
      attachments: input.attachments.length ? input.attachments : void 0
    };
  }
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
  const vaccinationView = (v, today) => ({ ...strip(v), state: vaccinationState(v.status, v.dueDate, today) });
  async function scheduleOne(ctx, v, tx) {
    const now = clock.now();
    const rec = { id: newId(), farmId: ctx.farmId, status: "scheduled", ...defined(v), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
    await repos.vaccinations.insert(rec, tx);
    return rec;
  }
  return {
    hooks,
    assertBirdsMayLeave,
    refreshWithheldEggs,
    /** Health costs of a flock up to a date: fees on records, medicine stock used, vaccine stock used. For flock profit. */
    async flockHealthCostMinor(ctx, flockId, asOf) {
      const [records, vaccinations] = await Promise.all([
        repos.healthRecords.find(ctx.farmId, { where: { flockId }, range: { field: "date", to: asOf } }),
        repos.vaccinations.find(ctx.farmId, { where: { flockId, status: "done" } })
      ]);
      const fees = records.reduce((t, r) => t + (r.cost?.amountMinor ?? 0) + (r.treatments ?? []).reduce((s2, x) => s2 + (x.stockCostMinor ?? 0), 0), 0);
      return fees + vaccinations.filter((v) => (v.administeredDate ?? "") <= asOf).reduce((t, v) => t + (v.stockCostMinor ?? 0), 0);
    },
    // ---- medicines
    async createMedicine(ctx, input) {
      assertCan(ctx, "health.manage");
      const now = clock.now();
      const { id, ...fields } = input;
      const rec = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.medicines.insert(rec, tx).catch(duplicate(`A medicine named "${rec.name}"`));
        await d.audit.record(ctx, { action: "medicine.created", entity: "medicine", entityId: rec.id, after: { name: rec.name, withdrawalMeatDays: rec.withdrawalMeatDays, withdrawalEggDays: rec.withdrawalEggDays } }, tx);
      });
      return strip(rec);
    },
    async updateMedicine(ctx, id, input) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const cur = await repos.medicines.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Medicine");
        const { version, ...fields } = input;
        const next = await repos.medicines.update(ctx.farmId, id, { ...fields, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version }, tx).catch(duplicate(`A medicine named "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This medicine was changed by someone else", { serverVersion: cur.version });
        await d.audit.record(ctx, { action: "medicine.updated", entity: "medicine", entityId: id, before: cur, after: next }, tx);
        return strip(next);
      });
    },
    async listMedicines(ctx) {
      assertCan(ctx, "health.read");
      return (await repos.medicines.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    // ---- health records
    async createRecord(ctx, input) {
      assertCan(ctx, input.type === "observation" ? "health.record_observation" : "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const flock = await validateRefs(ctx, farm, input, tx);
        const id = input.id ?? newId();
        const treatments = await buildTreatments(ctx, farm, flock, id, input.treatments, tx);
        const now = clock.now();
        const rec = {
          id,
          farmId: ctx.farmId,
          ...defined(recordFields(input)),
          ...treatments.length ? { treatments } : {},
          ...input.followUpDate ? { followUpDone: false } : {},
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.healthRecords.insert(rec, tx);
        for (const h of hooks.onCost) await h(ctx, rec, id, tx);
        await d.audit.record(ctx, { action: `health.${input.type}_recorded`, entity: "health_record", entityId: id, after: { flockId: rec.flockId, title: rec.title, treatments: treatments.map((t) => t.medicineName) } }, tx);
        await afterWrite(ctx, rec, farm, tx);
        return strip(rec);
      });
    },
    async updateRecord(ctx, id, input) {
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const cur = await repos.healthRecords.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Health record");
        assertCan(ctx, cur.type === "observation" && input.type === "observation" ? "health.record_observation" : "health.manage");
        if (cur.version !== input.version) throw new AppError("VERSION_CONFLICT", "This record was changed by someone else", { serverVersion: cur.version });
        if (cur.dailyRecordId) throw new AppError("INVALID_STATE_TRANSITION", "This observation belongs to a daily record; edit the daily record instead");
        const flock = await validateRefs(ctx, farm, input, tx);
        let treatments = cur.treatments ?? [];
        const effective = [];
        for (const t of input.treatments) {
          const med = t.medicineId ? await repos.medicines.findById(ctx.farmId, t.medicineId, tx) : null;
          effective.push({ ...t, withdrawalMeatDays: t.withdrawalMeatDays ?? med?.withdrawalMeatDays, withdrawalEggDays: t.withdrawalEggDays ?? med?.withdrawalEggDays });
        }
        if (treatmentKey(treatments) !== treatmentKey(effective)) {
          await E.reverseSource(ctx, id, "Treatment changed", farm, tx);
          treatments = await buildTreatments(ctx, farm, flock, id, input.treatments, tx);
        }
        const next = await repos.healthRecords.update(
          ctx.farmId,
          id,
          { ...recordFields(input), treatments: treatments.length ? treatments : void 0, followUpDone: input.followUpDate ? cur.followUpDone ?? false : void 0, updatedBy: ctx.userId, updatedAt: clock.now() },
          { expectedVersion: input.version },
          tx
        );
        if (!next) throw new AppError("VERSION_CONFLICT", "This record was changed by someone else");
        for (const h of hooks.onCost) await h(ctx, next, id, tx);
        await d.audit.record(ctx, { action: "health.record_updated", entity: "health_record", entityId: id, before: cur, after: next }, tx);
        await afterWrite(ctx, next, farm, tx);
        if (cur.flockId && cur.flockId !== next.flockId) await refreshWithheldEggs(ctx, cur.flockId, tx);
        return strip(next);
      });
    },
    /** Deleting a record returns its medicine to stock and lifts its withdrawal periods. */
    async deleteRecord(ctx, id) {
      assertCan(ctx, "health.manage");
      await repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const cur = await repos.healthRecords.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Health record");
        if (cur.dailyRecordId) throw new AppError("INVALID_STATE_TRANSITION", "This observation belongs to a daily record; edit the daily record instead");
        await E.reverseSource(ctx, id, "Health record deleted", farm, tx);
        const now = clock.now();
        const gone = await repos.healthRecords.update(ctx.farmId, id, { deletedAt: now, deletedBy: ctx.userId, updatedAt: now }, { expectedVersion: cur.version }, tx);
        for (const h of hooks.onCost) await h(ctx, null, id, tx);
        await d.audit.record(ctx, { action: "health.record_deleted", entity: "health_record", entityId: id, before: { title: cur.title, flockId: cur.flockId } }, tx);
        if (cur.flockId) await afterWrite(ctx, { ...cur, ...gone }, farm, tx);
      });
    },
    async getRecord(ctx, id) {
      assertCan(ctx, "health.read");
      const r = await repos.healthRecords.findById(ctx.farmId, id);
      if (!r) throw notFound("Health record");
      return { ...strip(r), attachments: (r.attachments ?? []).map((a) => ({ ...a, url: `/api/v1/farms/${ctx.farmId}/media/${a.assetId}` })) };
    },
    async listRecords(ctx, q8) {
      assertCan(ctx, "health.read");
      const where = {};
      if (q8.flockId) where["flockId"] = q8.flockId;
      if (q8.type) where["type"] = q8.type;
      const rows = await repos.healthRecords.find(ctx.farmId, { where, range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} }, sort: [{ field: "date", dir: -1 }], limit: q8.limit });
      return rows.map(strip);
    },
    async completeFollowUp(ctx, id) {
      assertCan(ctx, "health.record_observation");
      return repos.tx.run(async (tx) => {
        const r = await repos.healthRecords.findById(ctx.farmId, id, tx);
        if (!r) throw notFound("Health record");
        if (!r.followUpDate) throw new AppError("VALIDATION_FAILED", "This record has no follow-up");
        const next = await repos.healthRecords.update(ctx.farmId, id, { followUpDone: true, updatedBy: ctx.userId, updatedAt: clock.now() }, void 0, tx);
        await d.alerts.resolve(ctx, `follow_up:${id}`, tx);
        return strip(next);
      });
    },
    async withdrawals(ctx, flockId) {
      assertCan(ctx, "health.read");
      const farm = await E.farmOf(ctx);
      await L.loadFlock(ctx, flockId);
      const today = E.todayOf(farm);
      const windows = await windowsFor(ctx, flockId);
      const meat = activeWithdrawal(windows, today, "meat");
      const eggs = activeWithdrawal(windows, today, "eggs");
      return {
        date: today,
        meat: meat ? { until: meat.until, medicine: meat.medicineName, birdsMaySellFrom: addDays(meat.until, 1) } : null,
        eggs: eggs ? { until: eggs.until, medicine: eggs.medicineName, eggsMaySellFrom: addDays(eggs.until, 1) } : null,
        windows: windows.filter((w) => w.until >= today)
      };
    },
    // ---- vet appointments (tasks of kind vet_appointment; reminded by the vet appointment rule)
    async bookAppointment(ctx, r) {
      assertCan(ctx, "health.manage");
      if (r.flockId) await L.loadFlock(ctx, r.flockId);
      if (r.houseId && !await repos.houses.findById(ctx.farmId, r.houseId)) throw notFound("House");
      const farm = await E.farmOf(ctx);
      if (r.date < E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", "An appointment cannot be booked in the past");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, kind: "vet_appointment", title: r.vetName ? `${r.title} (${r.vetName})` : r.title, dueDate: r.date, status: "open", priority: "normal", ...defined({ description: r.notes, flockId: r.flockId, houseId: r.houseId }), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tasks.insert(rec);
      return strip(rec);
    },
    async listAppointments(ctx, q8) {
      assertCan(ctx, "health.read");
      return (await repos.tasks.find(ctx.farmId, { where: { kind: "vet_appointment", ...q8.includeDone ? {} : { status: ["open", "in_progress"] } }, sort: [{ field: "dueDate", dir: 1 }] })).map(strip);
    },
    async completeAppointment(ctx, id, notes) {
      assertCan(ctx, "health.manage");
      const t = await repos.tasks.findById(ctx.farmId, id);
      if (!t || t.kind !== "vet_appointment") throw notFound("Appointment");
      if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `This appointment is ${t.status}`);
      const next = await repos.tasks.update(ctx.farmId, id, { status: "done", completedAt: clock.now(), completedBy: ctx.userId, ...notes ? { resolutionNotes: notes } : {}, updatedAt: clock.now() }, { expectedVersion: t.version });
      await repos.tx.run((tx) => d.alerts.resolve(ctx, `vet_appointment:${id}`, tx));
      return strip(next);
    },
    // ---- programmes and vaccinations
    async createProgramme(ctx, input) {
      assertCan(ctx, "health.manage");
      for (const i of input.items) if (i.medicineId && !await repos.medicines.findById(ctx.farmId, i.medicineId)) throw notFound("Medicine");
      const now = clock.now();
      const { id, ...fields } = input;
      const rec = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.vaccinationProgrammes.insert(rec, tx).catch(duplicate(`A programme named "${rec.name}"`));
        await d.audit.record(ctx, { action: "programme.created", entity: "vaccination_programme", entityId: rec.id, after: { name: rec.name, items: rec.items.length } }, tx);
      });
      return strip(rec);
    },
    async listProgrammes(ctx) {
      assertCan(ctx, "health.read");
      return (await repos.vaccinationProgrammes.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    /** Schedules a programme for a flock by bird age. Items already scheduled from the same programme are skipped. */
    async applyProgramme(ctx, flockId, r) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, flockId, tx);
        L.assertStatus(flock, ["planned", "active"], "apply a vaccination programme");
        const prog = await repos.vaccinationProgrammes.findById(ctx.farmId, r.programmeId, tx);
        if (!prog || !prog.active) throw notFound("Vaccination programme");
        if (prog.flockTypes?.length && !prog.flockTypes.includes(flock.type)) throw new AppError("VALIDATION_FAILED", `${prog.name} is for ${prog.flockTypes.join(", ")} flocks`);
        const plan = scheduleProgramme(prog.items, { ...flock.hatchDate ? { hatchDate: flock.hatchDate } : {}, ...flock.placementDate ? { placementDate: flock.placementDate } : {}, ...flock.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {} }, E.todayOf(farm));
        const existing = await repos.vaccinations.find(ctx.farmId, { where: { flockId, programmeId: prog.id } }, tx);
        const have = new Set(existing.map((v) => `${v.dayOfAge}:${v.vaccineName}`));
        const created = [];
        for (const p6 of plan) {
          if (have.has(`${p6.dayOfAge}:${p6.vaccineName}`) || p6.past && !r.includePast) continue;
          created.push(await scheduleOne(ctx, { flockId, programmeId: prog.id, dayOfAge: p6.dayOfAge, vaccineName: p6.vaccineName, dueDate: p6.dueDate, ...p6.medicineId ? { medicineId: p6.medicineId } : {}, ...p6.targetDisease ? { targetDisease: p6.targetDisease } : {}, ...p6.route ? { route: p6.route } : {}, ...p6.notes ? { notes: p6.notes } : {} }, tx));
        }
        await d.audit.record(ctx, { action: "programme.applied", entity: "flock", entityId: flockId, after: { programme: prog.name, scheduled: created.length } }, tx);
        const today = E.todayOf(farm);
        return { scheduled: created.map((v) => vaccinationView(v, today)), skipped: plan.length - created.length };
      });
    },
    async scheduleVaccination(ctx, r) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, r.flockId, tx);
        L.assertStatus(flock, ["planned", "active"], "schedule a vaccination");
        if (r.medicineId && !await repos.medicines.findById(ctx.farmId, r.medicineId, tx)) throw notFound("Medicine");
        const v = await scheduleOne(ctx, { ...r }, tx);
        return vaccinationView(v, E.todayOf(farm));
      });
    },
    /**
     * Records a vaccination as given. From stock: doses leave the vaccine's lots FEFO, expired batches are refused,
     * and each batch number and expiry is recorded. Not from stock: the batches entered must not be expired.
     */
    async administer(ctx, id, r) {
      assertCan(ctx, "health.vaccinate");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const v = await repos.vaccinations.findById(ctx.farmId, id, tx);
        if (!v) throw notFound("Vaccination");
        if (v.status !== "scheduled") throw new AppError("INVALID_STATE_TRANSITION", `This vaccination is already ${v.status}`);
        if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        const flock = await L.loadFlock(ctx, v.flockId, tx);
        L.assertStatus(flock, ["active"], "record a vaccination");
        const alive = population((await L.loadEvents(ctx, flock.id, tx)).map(toLedger), r.date).alive;
        if (r.birdsVaccinated !== void 0 && r.birdsVaccinated > alive) throw new AppError("VALIDATION_FAILED", `${flock.flockCode} had ${alive} birds on ${r.date}`);
        let batches;
        let stockCostMinor;
        if (r.inventoryItemId) {
          const item = await E.loadItem(ctx, r.inventoryItemId, tx);
          if (item.category !== "vaccine") throw new AppError("VALIDATION_FAILED", `${item.name} is not a vaccine`);
          const taken = await E.take(ctx, item, r.dosesUsed, { date: r.date, purpose: "use", type: "issue", sourceType: "vaccination", sourceId: id, flockId: flock.id, houseId: flock.houseId, reason: `Vaccination: ${v.vaccineName}` }, farm, tx);
          const lots = await Promise.all(taken.allocations.map((a) => repos.inventoryLots.findById(ctx.farmId, a.lotId, tx)));
          batches = taken.allocations.map((a, i) => ({ lotId: a.lotId, doses: a.quantity, ...lots[i]?.batchNumber ? { batchNumber: lots[i].batchNumber } : {}, ...lots[i]?.expiryDate ? { expiryDate: lots[i].expiryDate } : {} }));
          stockCostMinor = taken.costMinor;
        } else if (r.batches) {
          const expired = r.batches.find((b) => b.expiryDate && b.expiryDate < r.date);
          if (expired) throw new AppError("VALIDATION_FAILED", `Batch ${expired.batchNumber} expired on ${expired.expiryDate}; an expired vaccine cannot be recorded as given`);
          batches = r.batches.map((b) => defined({ batchNumber: b.batchNumber, expiryDate: b.expiryDate, doses: b.doses }));
        }
        const next = await repos.vaccinations.update(
          ctx.farmId,
          id,
          defined({ status: "done", administeredDate: r.date, administeredBy: r.administeredBy, route: r.route ?? v.route, birdsVaccinated: r.birdsVaccinated, inventoryItemId: r.inventoryItemId, dosesUsed: r.dosesUsed, batches, stockCostMinor, notes: r.notes ?? v.notes, updatedBy: ctx.userId, updatedAt: clock.now() }),
          { expectedVersion: v.version },
          tx
        );
        if (!next) throw new AppError("VERSION_CONFLICT", "This vaccination was changed by someone else");
        await d.alerts.resolve(ctx, `vaccination:${id}`, tx);
        await d.audit.record(ctx, { action: "vaccination.given", entity: "vaccination", entityId: id, after: { flockId: v.flockId, vaccine: v.vaccineName, date: r.date, batches } }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "vaccination", entityId: id, op: "upsert", version: next.version }, tx);
        return vaccinationView(next, E.todayOf(farm));
      });
    },
    async skipVaccination(ctx, id, reason) {
      assertCan(ctx, "health.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const v = await repos.vaccinations.findById(ctx.farmId, id, tx);
        if (!v) throw notFound("Vaccination");
        if (v.status !== "scheduled") throw new AppError("INVALID_STATE_TRANSITION", `This vaccination is already ${v.status}`);
        const next = await repos.vaccinations.update(ctx.farmId, id, { status: "skipped", skipReason: reason, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: v.version }, tx);
        await d.alerts.resolve(ctx, `vaccination:${id}`, tx);
        await d.audit.record(ctx, { action: "vaccination.skipped", entity: "vaccination", entityId: id, after: { reason } }, tx);
        return vaccinationView(next, E.todayOf(farm));
      });
    },
    async listVaccinations(ctx, q8) {
      assertCan(ctx, "health.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const rows = await repos.vaccinations.find(ctx.farmId, { ...q8.flockId ? { where: { flockId: q8.flockId } } : {}, range: { field: "dueDate", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} }, sort: [{ field: "dueDate", dir: 1 }] });
      return rows.map((v) => vaccinationView(v, today)).filter((v) => !q8.state || v.state === q8.state);
    },
    /** Everything coming up or overdue: vaccinations, follow-ups and withdrawal periods ending. Reminders, not instructions. */
    async reminders(ctx, q8) {
      assertCan(ctx, "health.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const horizon = addDays(today, q8.days);
      const [vacc, follow, flocks] = await Promise.all([
        repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: horizon } }),
        repos.healthRecords.find(ctx.farmId, { where: { followUpDone: false }, range: { field: "followUpDate", to: horizon } }),
        repos.flocks.find(ctx.farmId, { where: { status: "active" } })
      ]);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      const items = [
        ...vacc.map((v) => ({ kind: "vaccination", date: v.dueDate, overdue: v.dueDate < today, title: `${v.vaccineName} for ${code.get(v.flockId) ?? "flock"}`, flockId: v.flockId, refId: v.id })),
        ...follow.map((r) => ({ kind: "follow_up", date: r.followUpDate, overdue: r.followUpDate < today, title: `Follow up: ${r.title}`, ...r.flockId ? { flockId: r.flockId } : {}, refId: r.id }))
      ];
      for (const f of flocks) {
        for (const w of await windowsFor(ctx, f.id)) {
          if (w.until >= today && w.until <= horizon) items.push({ kind: `withdrawal_${w.kind}_ends`, date: w.until, overdue: false, title: `${w.kind === "meat" ? "Meat" : "Egg"} withdrawal for ${w.medicineName} ends (${f.flockCode})`, flockId: f.id, refId: w.recordId });
        }
      }
      return { date: today, until: horizon, items: items.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0) };
    },
    /** Hourly: overdue vaccinations, follow-ups due, and withdrawal alerts that have ended. */
    async evaluateAlerts(ctx, tx) {
      const farm = await E.farmOf(ctx, tx);
      const today = E.todayOf(farm);
      const flocks = await repos.flocks.find(ctx.farmId, {}, tx);
      const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
      for (const v of await repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: addDays(today, -1) } }, tx)) {
        await d.alerts.raise(ctx, { ruleType: "vaccination_due", severity: "warning", title: `Vaccination overdue: ${code.get(v.flockId) ?? "flock"}`, message: `${v.vaccineName} for ${code.get(v.flockId) ?? "the flock"} was due on ${v.dueDate}. Record it as given, reschedule or skip it with a reason.`, dedupKey: `vaccination:${v.id}`, date: today, flockId: v.flockId }, tx);
      }
      for (const r of await repos.healthRecords.find(ctx.farmId, { where: { followUpDone: false }, range: { field: "followUpDate", to: today } }, tx)) {
        await d.alerts.raise(ctx, { ruleType: "health_follow_up", severity: "info", title: `Health follow-up due: ${r.title}`, message: `Follow-up planned for ${r.followUpDate}: ${r.title}.`, dedupKey: `follow_up:${r.id}`, date: today, ...r.flockId ? { flockId: r.flockId } : {} }, tx);
      }
      for (const a of await repos.alerts.find(ctx.farmId, { where: { ruleType: "withdrawal_active", status: ["open", "acknowledged"] } }, tx)) {
        if (a.flockId) {
          const w = await windowsFor(ctx, a.flockId, tx);
          if (!activeWithdrawal(w, today, "meat") && !activeWithdrawal(w, today, "eggs")) await d.alerts.resolve(ctx, a.dedupKey, tx);
        }
      }
    }
  };
}

// src/services/biosecurity.service.ts
var STOCK_PRODUCTS = /* @__PURE__ */ new Set(["disinfectant", "cleaning", "medicine", "litter", "other"]);
var STARTER_CHECKLISTS = [
  {
    name: "Visitor declaration",
    kind: "visitor_declaration",
    source: "PoultryPilot starter template (generic; edit to match your farm's rules)",
    items: [
      { id: "sick_birds_contact", text: "Have you been in contact with sick or dead poultry recently?", required: true, responseType: "yes_no", failIf: "yes", createActionOnFail: true },
      { id: "other_farm_today", text: "Have you visited another poultry farm, market or hatchery today?", required: true, responseType: "yes_no", failIf: "yes", createActionOnFail: true },
      { id: "farm_clothing", text: "Have you put on farm-provided clothing and boots?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "follow_rules", text: "Will you follow the farm's biosecurity instructions during the visit?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: false }
    ]
  },
  {
    name: "Footbath check",
    kind: "footbath",
    source: "PoultryPilot starter template (generic)",
    items: [
      { id: "clean", text: "Is the footbath free of visible dirt and organic matter?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "level", text: "Is the disinfectant at the marked level?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "concentration", text: "Concentration used (as on the product label)", required: false, responseType: "text", createActionOnFail: false }
    ]
  },
  {
    name: "House cleaning between flocks",
    kind: "cleaning",
    source: "PoultryPilot starter template (generic)",
    items: [
      { id: "litter_removed", text: "All litter and manure removed?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "dry_clean", text: "Dust and debris removed from walls, beams and equipment?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "washed", text: "House and equipment washed?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "disinfected", text: "Disinfectant applied as the label directs?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "water_lines", text: "Water lines flushed and cleaned?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true }
    ]
  },
  {
    name: "Monthly biosecurity audit",
    kind: "audit",
    source: "PoultryPilot starter template (generic)",
    items: [
      { id: "perimeter", text: "Perimeter fence and gates secure?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "wild_birds", text: "Houses closed to wild birds (nets, doors, gaps)?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "feed_covered", text: "Feed stores closed and spills cleaned up?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "dead_birds", text: "Dead birds removed and disposed of as your local rules require?", required: true, responseType: "yes_no", failIf: "no", createActionOnFail: true },
      { id: "rodents", text: "Signs of rodents found?", required: true, responseType: "yes_no", failIf: "yes", createActionOnFail: true }
    ]
  }
];
function createBiosecurityService(d) {
  const { repos, clock } = d;
  const E = d.inventory.engine;
  const strip = ({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
  async function runChecklist(ctx, input, expectedKinds, related, tx) {
    const tpl = await repos.checklistTemplates.findById(ctx.farmId, input.templateId, tx);
    if (!tpl || !tpl.active) throw notFound("Checklist");
    if (!expectedKinds.includes(tpl.kind)) throw new AppError("VALIDATION_FAILED", `That checklist is for ${tpl.kind.replace("_", " ")}, not ${expectedKinds.join(" or ").replace("_", " ")}`);
    const r = evaluateChecklist(tpl.items, input.answers);
    if (r.failed.length) {
      const now = clock.now();
      for (const f of r.failed) {
        const item = tpl.items.find((i) => i.id === f.itemId);
        if (!item.createActionOnFail) continue;
        await repos.tasks.insert(
          { id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Fix: ${item.text}`, description: `${related.label} on ${related.date}: answered "${typeof f.answer === "boolean" ? f.answer ? "yes" : "no" : f.answer}".`, dueDate: addDays(related.date, 1), status: "open", priority: "high", related: { entity: related.entity, id: related.id }, ...related.houseId ? { houseId: related.houseId } : {}, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 },
          tx
        );
      }
      await d.alerts.raise(ctx, { ruleType: "checklist_failed", severity: "warning", title: `${tpl.name}: ${r.failed.length} item(s) failed`, message: `${related.label} on ${related.date}: ${r.failed.map((f) => f.text).join("; ")}.`, dedupKey: `checklist:${related.entity}:${related.id}`, date: related.date, ...related.houseId ? { houseId: related.houseId } : {} }, tx);
    }
    return { templateId: tpl.id, templateVersion: tpl.version, answers: r.answers, failedCount: r.failed.length };
  }
  function nextDue(schedule, done) {
    switch (schedule) {
      case "daily":
        return addDays(done, 1);
      case "weekly":
        return addDays(done, 7);
      case "monthly":
        return addMonthsClamped(done, 1);
      default:
        return void 0;
    }
  }
  async function writeLog(ctx, body, tx) {
    const farm = await E.farmOf(ctx, tx);
    if (body.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${body.date} is in the future for this farm`);
    if (body.houseId && !await repos.houses.findById(ctx.farmId, body.houseId, tx)) throw notFound("House");
    for (const a of body.attachments) if (!await repos.mediaAssets.findById(ctx.farmId, a.assetId, tx)) throw new AppError("NOT_FOUND", `Attachment ${a.assetId} not found on this farm`);
    const id = newId();
    let product = body.product ? defined({ ...body.product }) : void 0;
    if (body.product?.inventoryItemId) {
      const item = await E.loadItem(ctx, body.product.inventoryItemId, tx);
      if (!STOCK_PRODUCTS.has(item.category)) throw new AppError("VALIDATION_FAILED", `${item.name} (${item.category}) cannot be used as a biosecurity product`);
      const taken = await E.take(ctx, item, body.product.quantityUsed, { date: body.date, purpose: "use", type: "issue", sourceType: "manual", sourceId: id, ...body.houseId ? { houseId: body.houseId } : {}, reason: `Biosecurity: ${body.type.replace(/_/g, " ")}` }, farm, tx);
      product = { ...product, name: body.product.name ?? item.name, stockCostMinor: taken.costMinor };
    }
    const kindFor = {
      cleaning: ["cleaning", "general"],
      disinfection: ["disinfection", "cleaning", "general"],
      footbath: ["footbath", "general"],
      vehicle: ["vehicle", "general"],
      pest_control: ["pest_control", "general"],
      audit: ["audit", "general"],
      wild_bird_observation: ["general", "audit"]
    };
    const checklist = body.checklist ? await runChecklist(ctx, body.checklist, kindFor[body.type], { entity: "biosecurity_log", id, date: body.date, ...body.houseId ? { houseId: body.houseId } : {}, label: body.type.replace(/_/g, " ") }, tx) : void 0;
    const now = clock.now();
    const rec = {
      id,
      farmId: ctx.farmId,
      type: body.type,
      date: body.date,
      ...defined({ houseId: body.houseId, cleaningTaskId: body.cleaningTaskId, performedBy: body.performedBy, details: body.details }),
      ...product ? { product } : {},
      ...body.footbath ? { footbath: defined(body.footbath) } : {},
      ...body.vehicle ? { vehicle: defined({ ...body.vehicle, entryAt: body.vehicle.entryAt ? new Date(body.vehicle.entryAt) : void 0, exitAt: body.vehicle.exitAt ? new Date(body.vehicle.exitAt) : void 0, lastPoultryContactAt: body.vehicle.lastPoultryContactAt ? new Date(body.vehicle.lastPoultryContactAt) : void 0 }) } : {},
      ...body.pest ? { pest: defined(body.pest) } : {},
      ...body.wildBird ? { wildBird: defined(body.wildBird) } : {},
      ...checklist ? { checklist } : {},
      ...body.attachments.length ? { attachments: body.attachments } : {},
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    await repos.biosecurityLogs.insert(rec, tx);
    if (body.wildBird && (body.wildBird.contactWithPoultry || body.wildBird.contactWithFeedOrWater || (body.wildBird.deadWildBirdsFound ?? 0) > 0)) {
      const dead = body.wildBird.deadWildBirdsFound ?? 0;
      await d.alerts.raise(ctx, {
        ruleType: "wild_bird_contact",
        severity: dead > 0 ? "critical" : "warning",
        title: dead > 0 ? `Dead wild birds found (${dead})` : "Wild birds in contact with poultry, feed or water",
        message: `${body.wildBird.description}${body.wildBird.location ? ` at ${body.wildBird.location}` : ""} on ${body.date}. Keep poultry away, close gaps, ${dead > 0 ? "do not handle dead birds without protection, and follow your local reporting requirements for dead wild birds" : "and watch the flock closely"}. Contact your veterinarian if you are concerned.`,
        dedupKey: `wild_bird:${id}`,
        date: body.date,
        ...body.houseId ? { houseId: body.houseId } : {}
      }, tx);
    }
    if (body.pest?.activityFound) {
      await repos.tasks.insert({ id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Pest activity found (${body.pest.pestType})`, description: `Found on ${body.date}${body.pest.method ? ` during ${body.pest.method}` : ""}. Agree and record a control measure.`, dueDate: addDays(body.date, 2), status: "open", priority: "high", related: { entity: "biosecurity_log", id }, ...body.houseId ? { houseId: body.houseId } : {}, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
    }
    if (body.vehicle && !body.vehicle.disinfected) {
      await repos.tasks.insert({ id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Vehicle ${body.vehicle.registration} entered without disinfection`, description: `On ${body.date}. Review the vehicle entry procedure.`, dueDate: addDays(body.date, 1), status: "open", priority: "normal", related: { entity: "biosecurity_log", id }, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
    }
    await d.audit.record(ctx, { action: `biosecurity.${body.type}`, entity: "biosecurity_log", entityId: id, after: { date: body.date, houseId: body.houseId, failed: checklist?.failedCount ?? 0 } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "biosecurity_log", entityId: id, op: "upsert", version: 0 }, tx);
    return rec;
  }
  return {
    /** Shared with ChickStart: evaluate answers against a farm checklist, raising actions and an alert on failures. */
    runChecklist,
    // ---- checklists
    async createTemplate(ctx, input) {
      assertCan(ctx, "biosecurity.manage");
      const now = clock.now();
      const { id, ...fields } = input;
      const rec = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), items: fields.items.map((i) => defined(i)), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.checklistTemplates.insert(rec, tx).catch(duplicate(`A ${rec.kind.replace("_", " ")} checklist named "${rec.name}"`));
        await d.audit.record(ctx, { action: "checklist.created", entity: "checklist_template", entityId: rec.id, after: { name: rec.name, kind: rec.kind, items: rec.items.length } }, tx);
      });
      return strip(rec);
    },
    /** Editing a checklist bumps its version; records keep the version and wording they were answered with. */
    async updateTemplate(ctx, id, input) {
      assertCan(ctx, "biosecurity.manage");
      return repos.tx.run(async (tx) => {
        const cur = await repos.checklistTemplates.findById(ctx.farmId, id, tx);
        if (!cur) throw notFound("Checklist");
        const { version, ...fields } = input;
        const next = await repos.checklistTemplates.update(ctx.farmId, id, { ...fields, items: fields.items.map((i) => defined(i)), updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version }, tx).catch(duplicate(`A checklist named "${input.name}"`));
        if (!next) throw new AppError("VERSION_CONFLICT", "This checklist was changed by someone else", { serverVersion: cur.version });
        await d.audit.record(ctx, { action: "checklist.updated", entity: "checklist_template", entityId: id, before: { version: cur.version, items: cur.items.length }, after: { version: next.version, items: next.items.length } }, tx);
        return strip(next);
      });
    },
    async listTemplates(ctx, q8) {
      assertCan(ctx, "biosecurity.read");
      return (await repos.checklistTemplates.find(ctx.farmId, { ...q8.kind ? { where: { kind: q8.kind } } : {}, sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    /** Adds the generic starter checklists the farm does not already have (by kind and name). */
    async addStarterTemplates(ctx) {
      assertCan(ctx, "biosecurity.manage");
      const existing = await repos.checklistTemplates.find(ctx.farmId);
      const have = new Set(existing.map((t) => `${t.kind}:${t.name}`));
      const created = [];
      await repos.tx.run(async (tx) => {
        const now = clock.now();
        for (const t of STARTER_CHECKLISTS) {
          if (have.has(`${t.kind}:${t.name}`)) continue;
          const rec = { id: newId(), farmId: ctx.farmId, ...t, active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
          await repos.checklistTemplates.insert(rec, tx);
          created.push(rec);
        }
        await d.audit.record(ctx, { action: "checklist.starters_added", entity: "farm", entityId: ctx.farmId, after: { added: created.length } }, tx);
      });
      return { added: created.map(strip) };
    },
    // ---- visitors
    /**
     * Checks a visitor in: records the declaration (against the farm's checklist), previous poultry contact and the
     * downtime since, PPE and footbath. A short downtime (by the farm's own rule) or a failed declaration flags the
     * visit and raises a biosecurity alert; entry decisions stay with the farm.
     */
    async checkIn(ctx, body) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        for (const h of body.housesVisited ?? []) if (!await repos.houses.findById(ctx.farmId, h, tx)) throw notFound("House");
        if (body.declaration?.signatureAssetId && !await repos.mediaAssets.findById(ctx.farmId, body.declaration.signatureAssetId, tx)) throw new AppError("NOT_FOUND", "Signature image not found on this farm");
        const id = newId();
        const checkInAt = body.checkInAt ? new Date(body.checkInAt) : clock.now();
        const lastContactAt = body.previousPoultryContact.lastContactAt ? new Date(body.previousPoultryContact.lastContactAt) : void 0;
        if (lastContactAt && lastContactAt > checkInAt) throw new AppError("VALIDATION_FAILED", "Last poultry contact is after the check-in time");
        const required = farm.settings.visitorDowntimeHours;
        const downtime = visitorDowntime(body.previousPoultryContact.hadContact ? lastContactAt : void 0, checkInAt, required);
        const date = new Intl.DateTimeFormat("en-CA", { timeZone: farm.settings.timezone }).format(checkInAt);
        const declarationChecklist = body.declaration?.checklist ? await runChecklist(ctx, body.declaration.checklist, ["visitor_declaration"], { entity: "visitor", id, date, label: `Visitor ${body.name}` }, tx) : void 0;
        const flags = [...downtime.short ? ["downtime_short"] : [], ...declarationChecklist?.failedCount ? ["declaration_failed"] : []];
        const now = clock.now();
        const rec = {
          id,
          farmId: ctx.farmId,
          ...defined({ name: body.name, company: body.company, type: body.type, phone: body.phone, purpose: body.purpose, vehicleRegistration: body.vehicleRegistration, housesVisited: body.housesVisited, notes: body.notes }),
          previousPoultryContact: defined({ hadContact: body.previousPoultryContact.hadContact, lastContactAt, description: body.previousPoultryContact.description }),
          ...downtime.hours !== null ? { downtimeHours: downtime.hours } : {},
          ...required !== void 0 ? { requiredDowntimeHours: required } : {},
          ...body.declaration ? { declaration: defined({ declaredName: body.declaration.declaredName, declaredAt: now, signatureAssetId: body.declaration.signatureAssetId, checklist: declarationChecklist }) } : {},
          ...body.ppeUsed?.length ? { ppeUsed: body.ppeUsed } : {},
          footbathUsed: body.footbathUsed,
          disinfected: body.disinfected,
          ...flags.length ? { flags } : {},
          checkInAt,
          hostUserId: ctx.userId,
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.visitors.insert(rec, tx);
        if (downtime.short) {
          await d.alerts.raise(ctx, { ruleType: "biosecurity_breach", severity: "warning", title: `Visitor downtime below the farm rule: ${body.name}`, message: `${body.name} last had poultry contact ${downtime.hours} hours before arriving; the farm requires ${required} hours.`, dedupKey: `visitor:${id}:downtime`, date }, tx);
        }
        await d.audit.record(ctx, { action: "visitor.checked_in", entity: "visitor", entityId: id, after: { name: body.name, flags } }, tx);
        return strip(rec);
      });
    },
    async checkOut(ctx, id, at) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const v = await repos.visitors.findById(ctx.farmId, id, tx);
        if (!v) throw notFound("Visitor");
        if (v.checkOutAt) throw new AppError("INVALID_STATE_TRANSITION", "This visitor has already checked out");
        const out = at ? new Date(at) : clock.now();
        if (out < v.checkInAt) throw new AppError("VALIDATION_FAILED", "Check-out is before check-in");
        const next = await repos.visitors.update(ctx.farmId, id, { checkOutAt: out, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: v.version }, tx);
        return strip(next);
      });
    },
    async listVisitors(ctx, q8) {
      assertCan(ctx, "biosecurity.read");
      const rows = await repos.visitors.find(ctx.farmId, { ...q8.flagged ? { exists: { flags: true } } : {}, sort: [{ field: "checkInAt", dir: -1 }], limit: 500 });
      const inRange = (d2) => (!q8.from || d2 >= /* @__PURE__ */ new Date(`${q8.from}T00:00:00Z`)) && (!q8.to || d2 <= /* @__PURE__ */ new Date(`${q8.to}T23:59:59Z`));
      return rows.filter((v) => inRange(v.checkInAt)).map(strip);
    },
    // ---- logs
    async createLog(ctx, body) {
      assertCan(ctx, "biosecurity.record");
      return strip(await repos.tx.run((tx) => writeLog(ctx, body, tx)));
    },
    async listLogs(ctx, q8) {
      assertCan(ctx, "biosecurity.read");
      const where = {};
      if (q8.type) where["type"] = q8.type;
      if (q8.houseId) where["houseId"] = q8.houseId;
      return (await repos.biosecurityLogs.find(ctx.farmId, { where, range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} }, sort: [{ field: "date", dir: -1 }], limit: q8.limit })).map(strip);
    },
    // ---- equipment
    async createEquipment(ctx, body) {
      assertCan(ctx, "biosecurity.manage");
      if (body.houseId && !await repos.houses.findById(ctx.farmId, body.houseId)) throw notFound("House");
      const now = clock.now();
      const { id, ...fields } = body;
      const rec = { id: id ?? newId(), farmId: ctx.farmId, ...defined(fields), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.equipment.insert(rec);
      return strip(rec);
    },
    async listEquipment(ctx) {
      assertCan(ctx, "biosecurity.read");
      return (await repos.equipment.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    /** Records a move between houses or off the farm. Moving without disinfection raises a corrective action. */
    async moveEquipment(ctx, equipmentId, r) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const eq = await repos.equipment.findById(ctx.farmId, equipmentId, tx);
        if (!eq) throw notFound("Equipment");
        if (r.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        if (r.toHouseId && !await repos.houses.findById(ctx.farmId, r.toHouseId, tx)) throw notFound("House");
        if (r.toHouseId && r.toHouseId === eq.houseId) throw new AppError("VALIDATION_FAILED", "The equipment is already in that house");
        const now = clock.now();
        const move = { id: newId(), farmId: ctx.farmId, equipmentId, date: r.date, ...defined({ fromHouseId: eq.houseId, toHouseId: r.toHouseId, offFarmDestination: r.offFarmDestination, movedBy: r.movedBy, note: r.note }), disinfected: r.disinfected, createdBy: ctx.userId, createdAt: now, updatedAt: now };
        await repos.equipmentMovements.insert(move, tx);
        await repos.equipment.update(ctx.farmId, equipmentId, { houseId: r.toHouseId, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: eq.version }, tx);
        if (!r.disinfected) {
          await repos.tasks.insert({ id: newId(), farmId: ctx.farmId, kind: "corrective_action", title: `Disinfect ${eq.name} after its move`, description: `Moved on ${r.date} without disinfection${r.toHouseId ? "" : ` (to ${r.offFarmDestination})`}.`, dueDate: r.date, status: "open", priority: "high", related: { entity: "equipment_movement", id: move.id }, ...r.toHouseId ? { houseId: r.toHouseId } : {}, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
        }
        await d.audit.record(ctx, { action: "equipment.moved", entity: "equipment", entityId: equipmentId, after: { from: eq.houseId, to: r.toHouseId ?? r.offFarmDestination, disinfected: r.disinfected } }, tx);
        const { farmId: _f, updatedAt: _u, createdAt, ...m } = move;
        return { ...m, createdAt: createdAt.toISOString() };
      });
    },
    // ---- cleaning schedules
    async createSchedule(ctx, body) {
      assertCan(ctx, "biosecurity.manage");
      if (body.checklistTemplateId && !await repos.checklistTemplates.findById(ctx.farmId, body.checklistTemplateId)) throw notFound("Checklist");
      for (const h of body.houseIds ?? []) if (!await repos.houses.findById(ctx.farmId, h)) throw notFound("House");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(body), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.cleaningTasks.insert(rec);
      return strip(rec);
    },
    async listSchedules(ctx) {
      assertCan(ctx, "biosecurity.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      return (await repos.cleaningTasks.find(ctx.farmId, { where: { active: true }, sort: [{ field: "nextDueDate", dir: 1 }] })).map((t) => ({ ...strip(t), overdue: !!t.nextDueDate && t.nextDueDate < today }));
    },
    /** Completing a schedule writes the cleaning or disinfection log (with checklist answers) and moves the next due date. */
    async completeSchedule(ctx, id, r) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const task = await repos.cleaningTasks.findById(ctx.farmId, id, tx);
        if (!task || !task.active) throw notFound("Cleaning schedule");
        if (task.checklistTemplateId && !r.checklist) throw new AppError("CHECKLIST_INCOMPLETE", "This schedule has a checklist; send its answers");
        if (r.checklist && task.checklistTemplateId && r.checklist.templateId !== task.checklistTemplateId) throw new AppError("VALIDATION_FAILED", "Use the checklist set on this schedule");
        const houseId = r.houseId ?? (task.houseIds?.length === 1 ? task.houseIds[0] : void 0);
        const log = await writeLog(ctx, { type: task.activity, date: r.date, cleaningTaskId: id, attachments: [], ...defined({ houseId, performedBy: r.performedBy, product: r.product, checklist: r.checklist, details: r.details }) }, tx);
        const next = nextDue(task.schedule, r.date);
        await repos.cleaningTasks.update(ctx.farmId, id, { lastDoneDate: r.date, nextDueDate: next, active: task.schedule !== "one_off", updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: task.version }, tx);
        return { log: strip(log), nextDueDate: next ?? null };
      });
    },
    // ---- corrective actions
    async createAction(ctx, body) {
      assertCan(ctx, "biosecurity.record");
      if (body.assigneeUserId && !await repos.memberships.findActive(ctx.farmId, body.assigneeUserId)) throw new AppError("VALIDATION_FAILED", "The assignee is not a member of this farm");
      if (body.houseId && !await repos.houses.findById(ctx.farmId, body.houseId)) throw notFound("House");
      if (body.flockId && !await repos.flocks.findById(ctx.farmId, body.flockId)) throw notFound("Flock");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, kind: "corrective_action", status: "open", ...defined(body), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tasks.insert(rec);
      return strip(rec);
    },
    async listActions(ctx, q8) {
      assertCan(ctx, "biosecurity.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const rows = await repos.tasks.find(ctx.farmId, { where: { kind: q8.kind, ...q8.status ? { status: q8.status } : {} }, sort: [{ field: "dueDate", dir: 1 }] });
      return rows.map((t) => ({ ...strip(t), overdue: t.status !== "done" && t.status !== "cancelled" && !!t.dueDate && t.dueDate < today }));
    },
    async completeAction(ctx, id, notes) {
      assertCan(ctx, "biosecurity.record");
      return repos.tx.run(async (tx) => {
        const t = await repos.tasks.findById(ctx.farmId, id, tx);
        if (!t) throw notFound("Corrective action");
        if (t.status === "done" || t.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", `This action is already ${t.status}`);
        const next = await repos.tasks.update(ctx.farmId, id, { status: "done", completedAt: clock.now(), completedBy: ctx.userId, resolutionNotes: notes, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: t.version }, tx);
        if (t.related) await d.alerts.resolve(ctx, `checklist:${t.related.entity}:${t.related.id}`, tx).catch(() => void 0);
        await d.audit.record(ctx, { action: "corrective_action.completed", entity: "task", entityId: id, after: { notes } }, tx);
        return strip(next);
      });
    },
    /** A supervisor confirms the fix worked. The person who completed it cannot verify their own work. */
    async verifyAction(ctx, id) {
      assertCan(ctx, "biosecurity.manage");
      return repos.tx.run(async (tx) => {
        const t = await repos.tasks.findById(ctx.farmId, id, tx);
        if (!t) throw notFound("Corrective action");
        if (t.status !== "done") throw new AppError("INVALID_STATE_TRANSITION", "Only a completed action can be verified");
        if (t.completedBy === ctx.userId) throw new AppError("FORBIDDEN", "Someone other than the person who completed the action must verify it");
        const next = await repos.tasks.update(ctx.farmId, id, { verifiedAt: clock.now(), verifiedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: t.version }, tx);
        await d.audit.record(ctx, { action: "corrective_action.verified", entity: "task", entityId: id }, tx);
        return strip(next);
      });
    },
    /** Biosecurity at a glance for the dashboard. */
    async summary(ctx) {
      assertCan(ctx, "biosecurity.read");
      const farm = await E.farmOf(ctx);
      const today = E.todayOf(farm);
      const weekAgo = addDays(today, -7);
      const [visitors, actions, schedules, logs] = await Promise.all([
        repos.visitors.find(ctx.farmId, { sort: [{ field: "checkInAt", dir: -1 }], limit: 200 }),
        repos.tasks.find(ctx.farmId, { where: { kind: "corrective_action", status: ["open", "in_progress"] } }),
        repos.cleaningTasks.find(ctx.farmId, { where: { active: true } }),
        repos.biosecurityLogs.find(ctx.farmId, { range: { field: "date", from: weekAgo, to: today } })
      ]);
      const dateOf = (d2) => new Intl.DateTimeFormat("en-CA", { timeZone: farm.settings.timezone }).format(d2);
      const lastFootbath = (await repos.biosecurityLogs.find(ctx.farmId, { where: { type: "footbath" }, sort: [{ field: "date", dir: -1 }], limit: 1 }))[0];
      return {
        date: today,
        visitorsToday: visitors.filter((v) => dateOf(v.checkInAt) === today).length,
        visitorsOnSite: visitors.filter((v) => !v.checkOutAt && dateOf(v.checkInAt) === today).length,
        flaggedVisitorsLast7Days: visitors.filter((v) => v.flags?.length && dateOf(v.checkInAt) >= weekAgo).length,
        openCorrectiveActions: actions.length,
        overdueCorrectiveActions: actions.filter((a) => a.dueDate && a.dueDate < today).length,
        cleaningOverdue: schedules.filter((s2) => s2.nextDueDate && s2.nextDueDate < today).length,
        cleaningDueToday: schedules.filter((s2) => s2.nextDueDate === today).length,
        failedChecksLast7Days: logs.filter((l) => (l.checklist?.failedCount ?? 0) > 0).length,
        wildBirdContactsLast7Days: logs.filter((l) => l.wildBird && (l.wildBird.contactWithPoultry || l.wildBird.contactWithFeedOrWater || (l.wildBird.deadWildBirdsFound ?? 0) > 0)).length,
        lastFootbathCheck: lastFootbath?.date ?? null
      };
    }
  };
}

// src/services/content.service.ts
var DISCLAIMER = "This is general information, not veterinary advice. Talk to your veterinarian about your flock.";
var SEED_ARTICLES = [
  {
    kind: "guide",
    origin: "original",
    category: "biosecurity",
    author: "PoultryPilot editorial team",
    slug: "biosecurity-basics",
    locale: "en",
    title: "Biosecurity basics for poultry farms",
    summary: "The everyday habits that keep disease out of a flock: controlling who and what comes in, keeping houses clean, and keeping wild birds and rodents away.",
    content: [
      "Biosecurity means the practices that stop disease agents entering a farm, spreading within it, or leaving it.",
      "Control movement: keep a record of every visitor and vehicle, ask about recent contact with other poultry, and provide farm boots and clothing. Many farms set a minimum time since a visitor last had contact with poultry; agree yours with your veterinarian.",
      "Keep it clean: remove litter and organic matter before disinfecting, use disinfectants as the label directs, and keep footbaths clean and topped up.",
      "Keep wild birds and rodents out: close gaps, cover feed, clean up spills, and record what you see.",
      "Know your obligations: rules on reporting disease, disposing of dead birds and moving poultry differ between countries. Ask your veterinarian or local animal health authority which apply to you.",
      "This is general information, not veterinary advice."
    ].join("\n\n"),
    regionCode: "GLOBAL",
    tags: ["biosecurity"],
    status: "published",
    publishedAt: /* @__PURE__ */ new Date("2026-10-01T00:00:00Z"),
    sources: [
      { name: "FAO (2008). Biosecurity for Highly Pathogenic Avian Influenza: Issues and Options. FAO Animal Production and Health Paper 165", url: "https://www.fao.org/3/i0359e/i0359e00.htm" },
      { name: "World Organisation for Animal Health (WOAH): Avian influenza", url: "https://www.woah.org/en/disease/avian-influenza/" }
    ]
  },
  {
    kind: "guide",
    origin: "original",
    category: "health",
    author: "PoultryPilot editorial team",
    slug: "withdrawal-periods",
    locale: "en",
    title: "What a withdrawal period is, and why records matter",
    summary: "Why meat and eggs from treated birds must not be sold until the withdrawal period has passed, and how PoultryPilot helps you keep track.",
    content: [
      "After birds receive some medicines, residues can remain in meat or eggs for a time. The withdrawal period is the time after the last dose during which meat or eggs must not enter the food supply.",
      "The period depends on the product and how it is used. It is printed on the label or set by your veterinarian, and limits are set nationally. PoultryPilot does not supply withdrawal periods: you record the one that applies, and the app calculates the end date, reminds you, and blocks bird sales until it has passed.",
      "Keep a record of every treatment: product, batch, dose, how it was given, start date, duration and who prescribed it. Use medicines only as directed by your veterinarian.",
      "This is general information, not veterinary advice."
    ].join("\n\n"),
    regionCode: "GLOBAL",
    tags: ["health", "medicines"],
    status: "published",
    publishedAt: /* @__PURE__ */ new Date("2026-10-01T00:00:00Z"),
    sources: [
      { name: "Codex Alimentarius: Maximum residue limits for residues of veterinary drugs in foods (database)", url: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/dbs/vetdrugs/en/" },
      { name: "World Organisation for Animal Health (WOAH): Antimicrobial resistance", url: "https://www.woah.org/en/what-we-do/global-initiatives/antimicrobial-resistance/" }
    ]
  },
  {
    kind: "guide",
    origin: "original",
    category: "health",
    author: "PoultryPilot editorial team",
    slug: "when-to-call-your-veterinarian",
    locale: "en",
    title: "Changes worth calling your veterinarian about",
    summary: "Records that often show trouble early, and why a sudden change should prompt a call rather than a guess.",
    content: [
      "Many poultry diseases look alike, and some must be reported to the authorities. Only a veterinarian, often with laboratory tests, can say what is wrong. PoultryPilot records what you observe; it does not diagnose.",
      "Changes that are worth a call: a sudden rise in deaths; birds eating or drinking noticeably less; a sharp drop in egg production or egg quality; breathing difficulty, swelling or unusual droppings in several birds.",
      "Your daily records help your veterinarian: deaths per day, feed and water use, eggs, and photos of what you saw.",
      "If you suspect a notifiable disease, follow your country's reporting rules; your veterinarian or local animal health office can tell you what they are.",
      "This is general information, not veterinary advice."
    ].join("\n\n"),
    regionCode: "GLOBAL",
    tags: ["health"],
    status: "published",
    publishedAt: /* @__PURE__ */ new Date("2026-10-01T00:00:00Z"),
    sources: [
      { name: "World Organisation for Animal Health (WOAH): Newcastle disease", url: "https://www.woah.org/en/disease/newcastle-disease/" },
      { name: "World Organisation for Animal Health (WOAH): Avian influenza", url: "https://www.woah.org/en/disease/avian-influenza/" }
    ]
  }
];
function regionsFor(region) {
  if (!region) return ["GLOBAL"];
  return [.../* @__PURE__ */ new Set(["GLOBAL", region.slice(0, 2), region])];
}
var stripHtml = (s2) => s2.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
var slugify = (s2) => s2.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "item";
function assertPublishable(a) {
  const missing = [];
  if (!a.summary) missing.push("summary");
  if (a.origin === "external") {
    if (!a.source) missing.push("source");
    if (!a.sourceUrl) missing.push("sourceUrl");
    if (!a.publicationDate) missing.push("publicationDate");
  }
  if (a.kind === "news" && !a.publicationDate && !missing.includes("publicationDate")) missing.push("publicationDate");
  const health = a.kind === "disease" || a.category === "health" || a.category === "biosecurity" || !!a.tags?.some((t) => t === "health" || t === "biosecurity");
  if (health && a.origin !== "external" && !a.sources.length) missing.push("sources (health, biosecurity and disease content must cite references)");
  if (missing.length) throw new AppError("VALIDATION_FAILED", `Cannot publish yet; missing: ${missing.join(", ")}`, { missing });
}
function createContentService(d) {
  const { repos, clock } = d;
  async function requireRole(ctx, role) {
    const roles = (await repos.users.findById(ctx.userId))?.platformRoles ?? [];
    if (!roles.includes(role) && !(role === "content_editor" && roles.includes("content_publisher"))) throw new AppError("FORBIDDEN", `This needs the ${role.replace("_", " ")} role`);
  }
  const articleView = (a, full) => ({
    id: a.id,
    slug: a.slug,
    kind: a.kind,
    origin: a.origin,
    locale: a.locale,
    title: a.title,
    summary: a.summary ?? null,
    ...full ? { content: a.content ?? null } : {},
    category: a.category,
    author: a.author ?? null,
    source: a.source ?? null,
    sourceUrl: a.sourceUrl ?? null,
    publicationDate: a.publicationDate ?? a.publishedAt?.toISOString().slice(0, 10) ?? null,
    region: a.regionCode,
    tags: a.tags ?? [],
    status: a.status,
    ...full && a.disease ? { disease: a.disease } : {},
    ...full ? { references: a.sources } : {},
    ...full && (a.kind === "disease" || a.category === "health") ? { disclaimer: DISCLAIMER } : {},
    ...full && a.origin === "external" ? { attribution: `Summary by PoultryPilot. Read the original at ${a.source}.` } : {},
    reviewedBy: a.reviewedBy ?? null
  });
  const editorView = (a) => ({ ...articleView(a, true), version: a.version, submittedBy: a.submittedBy ?? null, updatedAt: a.updatedAt.toISOString() });
  async function published(q8) {
    return repos.articles.find({
      status: "published",
      ...q8.kind ? { kind: q8.kind } : {},
      ...q8.category ? { category: q8.category } : {},
      ...q8.q ? { text: q8.q } : {},
      locale: q8.locale,
      regionCodes: regionsFor(q8.region),
      sortBy: q8.kind === "news" ? "publicationDate" : "publishedAt",
      limit: q8.limit
    });
  }
  async function loadArticle(id) {
    const a = await repos.articles.findById(id);
    if (!a) throw notFound("Article");
    return a;
  }
  async function writeArticle(ctx, a, patch, expectedVersion) {
    const next = await repos.articles.update(a.id, { ...patch, updatedBy: ctx.userId, updatedAt: clock.now() }, expectedVersion);
    if (!next) throw new AppError("VERSION_CONFLICT", "This article was changed by someone else. Reload and try again.", { serverVersion: a.version });
    return next;
  }
  const duplicate2 = (what) => (e) => {
    if (e.code === 11e3) throw new AppError("DUPLICATE", `${what} already exists`);
    throw e;
  };
  async function courseView(ctx, slug, locale2) {
    const c = await repos.courses.findBySlug(slug, locale2);
    if (!c || c.status !== "published") throw notFound("Course");
    const done = new Map((await repos.trainingProgress.forUser(ctx.userId, c.id)).map((p6) => [p6.lessonId, p6.completedAt]));
    const lessons = [...c.lessons].sort((a, b) => a.order - b.order);
    return {
      slug: c.slug,
      title: c.title,
      summary: c.summary ?? null,
      level: c.level,
      category: c.category,
      author: c.author ?? null,
      references: c.sources,
      lessons: lessons.map((l) => ({ lessonId: l.lessonId, title: l.title, content: l.content ?? null, minutes: l.minutes ?? null, completedAt: done.get(l.lessonId)?.toISOString() ?? null })),
      progress: { completed: done.size, total: lessons.length, percent: lessons.length ? Math.round(done.size / lessons.length * 100) : 0 }
    };
  }
  return {
    // ---- readers (any signed-in user)
    async listArticles(_ctx, q8) {
      return (await published(q8)).map((a) => articleView(a, false));
    },
    /** News for the reader's region, newest publication first. Comes from the database; nothing is built into the apps. */
    async news(_ctx, q8) {
      return (await published({ ...q8, kind: "news" })).map((a) => articleView(a, false));
    },
    async getArticle(_ctx, slug, locale2) {
      const a = await repos.articles.findBySlug(slug, locale2);
      if (!a || a.status !== "published") throw notFound("Article");
      return articleView(a, true);
    },
    /** One fact a day for the reader's region: the same for everyone on a given date. */
    async factOfTheDay(_ctx, q8) {
      const facts = await published({ kind: "fact", ...q8.region ? { region: q8.region } : {}, locale: q8.locale, limit: 500 });
      if (!facts.length) return null;
      const day = Math.floor(clock.now().getTime() / 864e5);
      const sorted = [...facts].sort((a, b) => a.slug < b.slug ? -1 : 1);
      return articleView(sorted[day % sorted.length], true);
    },
    async glossary(_ctx, q8) {
      const rows = await repos.glossary.find({ status: "published", ...q8.q ? { text: q8.q } : {}, ...q8.category ? { category: q8.category } : {}, locale: q8.locale, regionCodes: regionsFor(q8.region), sortBy: "term", limit: q8.limit });
      return rows.map((t) => ({ slug: t.slug, term: t.term, definition: t.definition ?? null, category: t.category, relatedSlugs: t.relatedSlugs ?? [], references: t.sources }));
    },
    async courses(ctx, q8) {
      const rows = await repos.courses.find({ status: "published", ...q8.category ? { category: q8.category } : {}, locale: q8.locale, regionCodes: regionsFor(q8.region), sortBy: "order", limit: 200 });
      const done = await repos.trainingProgress.forUser(ctx.userId);
      return rows.map((c) => ({ slug: c.slug, title: c.title, summary: c.summary ?? null, level: c.level, category: c.category, lessons: c.lessons.length, minutes: c.lessons.reduce((t, l) => t + (l.minutes ?? 0), 0), completedLessons: done.filter((p6) => p6.courseId === c.id).length }));
    },
    course: courseView,
    async completeLesson(ctx, slug, lessonId, locale2) {
      const c = await repos.courses.findBySlug(slug, locale2);
      if (!c || c.status !== "published") throw notFound("Course");
      if (!c.lessons.some((l) => l.lessonId === lessonId)) throw notFound("Lesson");
      await repos.trainingProgress.complete(ctx.userId, c.id, lessonId, clock.now());
      return courseView(ctx, slug, locale2);
    },
    /** Farm-scoped alias: published articles for the farm's country and global ones. */
    async list(ctx, q8) {
      assertCan(ctx, "content.read");
      const farm = await repos.farms.findById(ctx.farmId);
      const region = q8.region ?? farm?.countryCode;
      const rows = await published({ ...q8.kind ? { kind: q8.kind } : {}, ...region ? { region } : {}, locale: q8.locale, limit: 200 });
      return rows.filter((a) => !q8.tag || a.tags?.includes(q8.tag)).map((a) => articleView(a, false));
    },
    async get(ctx, slug, locale2) {
      assertCan(ctx, "content.read");
      const a = await repos.articles.findBySlug(slug, locale2);
      if (!a || a.status !== "published") throw notFound("Article");
      return articleView(a, true);
    },
    // ---- editors and publishers (platform roles)
    async editorList(ctx, q8) {
      await requireRole(ctx, "content_editor");
      return (await repos.articles.find({ ...q8.status ? { status: q8.status } : {}, ...q8.kind ? { kind: q8.kind } : {}, ...q8.q ? { text: q8.q } : {}, sortBy: "updatedAt", limit: q8.limit })).map(editorView);
    },
    async editorGet(ctx, id) {
      await requireRole(ctx, "content_editor");
      return editorView(await loadArticle(id));
    },
    async createArticle(ctx, i) {
      await requireRole(ctx, "content_editor");
      const now = clock.now();
      const rec = { id: newId(), ...i, sources: i.sources ?? [], status: "draft", createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.articles.insert(rec).catch(duplicate2("An article with that slug or source URL"));
      return editorView(rec);
    },
    /** Drafts and articles in review can be edited by editors; published ones only by publishers (and stay checked). */
    async updateArticle(ctx, id, i) {
      await requireRole(ctx, "content_editor");
      const a = await loadArticle(id);
      if (a.status === "archived") throw new AppError("INVALID_STATE_TRANSITION", "Archived articles cannot be edited");
      if (a.status === "published") {
        await requireRole(ctx, "content_publisher");
        assertPublishable({ ...i, sources: i.sources ?? [] });
      }
      const { version, ...fields } = i;
      const blank = { summary: void 0, content: void 0, author: void 0, source: void 0, sourceUrl: void 0, publicationDate: void 0, tags: void 0, disease: void 0 };
      return editorView(await writeArticle(ctx, a, { ...blank, ...fields, sources: i.sources ?? [] }, version).catch(duplicate2("An article with that slug or source URL")));
    },
    async submit(ctx, id) {
      await requireRole(ctx, "content_editor");
      const a = await loadArticle(id);
      if (a.status !== "draft") throw new AppError("INVALID_STATE_TRANSITION", `A ${a.status} article cannot be submitted`);
      assertPublishable(a);
      return editorView(await writeArticle(ctx, a, { status: "in_review", submittedBy: ctx.userId }, a.version));
    },
    /** Publishing is a publisher's review. Health, biosecurity and disease content needs a second person. */
    async publish(ctx, id) {
      await requireRole(ctx, "content_publisher");
      const a = await loadArticle(id);
      if (a.status !== "in_review") throw new AppError("INVALID_STATE_TRANSITION", a.status === "draft" ? "Submit the article for review first" : `A ${a.status} article cannot be published`);
      assertPublishable(a);
      const health = a.kind === "disease" || a.category === "health" || a.category === "biosecurity";
      if (health && a.submittedBy === ctx.userId) throw new AppError("FORBIDDEN", "Health, biosecurity and disease content must be published by someone other than the person who submitted it");
      const reviewer = (await repos.users.findById(ctx.userId))?.fullName ?? ctx.userId;
      return editorView(await writeArticle(ctx, a, { status: "published", publishedAt: a.publishedAt ?? clock.now(), reviewedBy: reviewer, reviewedAt: clock.now() }, a.version));
    },
    async reject(ctx, id, reason) {
      await requireRole(ctx, "content_publisher");
      const a = await loadArticle(id);
      if (a.status !== "in_review") throw new AppError("INVALID_STATE_TRANSITION", `A ${a.status} article cannot be sent back`);
      const tags = [.../* @__PURE__ */ new Set([...a.tags ?? [], "needs-changes"])];
      return { ...editorView(await writeArticle(ctx, a, { status: "draft", tags }, a.version)), reason };
    },
    async archive(ctx, id) {
      await requireRole(ctx, "content_publisher");
      const a = await loadArticle(id);
      if (a.status === "archived") throw new AppError("INVALID_STATE_TRANSITION", "Already archived");
      return editorView(await writeArticle(ctx, a, { status: "archived" }, a.version));
    },
    /**
     * Imports externally sourced items (from a news feed or a partner) for review: one article per source URL, title and
     * the publisher's own teaser only (HTML stripped, 600 characters at most), never the full text. Always in review.
     */
    async importExternal(ctx, items, kind = "news") {
      if (ctx) await requireRole(ctx, "content_editor");
      let created = 0;
      let skipped = 0;
      const now = clock.now();
      for (const it of items) {
        if (!/^https?:\/\//.test(it.sourceUrl) || !it.title.trim() || await repos.articles.findBySourceUrl(it.sourceUrl)) {
          skipped++;
          continue;
        }
        const summary = it.summary ? stripHtml(it.summary).slice(0, 600) : void 0;
        const base = slugify(stripHtml(it.title));
        let slug = base;
        for (let n = 2; await repos.articles.findBySlug(slug, "en"); n++) slug = `${base}-${n}`;
        await repos.articles.insert({
          id: newId(),
          kind,
          origin: "external",
          slug,
          locale: "en",
          title: stripHtml(it.title).slice(0, 200),
          ...summary ? { summary } : {},
          category: it.category,
          ...it.author ? { author: it.author.slice(0, 120) } : {},
          source: it.source.slice(0, 160),
          sourceUrl: it.sourceUrl,
          ...it.publicationDate ? { publicationDate: it.publicationDate } : {},
          regionCode: it.regionCode,
          sources: [],
          status: "in_review",
          createdBy: ctx?.userId ?? "system",
          createdAt: now,
          updatedAt: now,
          version: 0
        });
        created++;
      }
      return { created, skipped };
    },
    // ---- glossary and courses (editorial)
    async upsertGlossary(ctx, i) {
      await requireRole(ctx, i.status === "published" ? "content_publisher" : "content_editor");
      const now = clock.now();
      const cur = await repos.glossary.findBySlug(i.slug, i.locale);
      const { version, ...fields } = i;
      if (!cur) {
        const rec = { id: newId(), ...fields, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
        await repos.glossary.insert(rec);
        return rec;
      }
      const next = await repos.glossary.update(cur.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, version ?? cur.version);
      if (!next) throw new AppError("VERSION_CONFLICT", "This term was changed by someone else");
      return next;
    },
    async upsertCourse(ctx, i) {
      await requireRole(ctx, i.status === "published" ? "content_publisher" : "content_editor");
      const ids = i.lessons.map((l) => l.lessonId);
      if (new Set(ids).size !== ids.length) throw new AppError("VALIDATION_FAILED", "Lesson ids must be unique within a course");
      if (i.status === "published" && (!i.lessons.length || i.lessons.some((l) => !l.content))) throw new AppError("VALIDATION_FAILED", "A published course needs at least one lesson, and every lesson needs content");
      if (i.status === "published" && (i.category === "health" || i.category === "biosecurity") && !i.sources.length) throw new AppError("VALIDATION_FAILED", "Health and biosecurity courses must cite references");
      const now = clock.now();
      const cur = await repos.courses.findBySlug(i.slug, i.locale);
      const { version, ...fields } = i;
      const review = i.status === "published" ? { publishedAt: cur?.publishedAt ?? now, reviewedBy: (await repos.users.findById(ctx.userId))?.fullName ?? ctx.userId, reviewedAt: now } : {};
      if (!cur) {
        const rec = { id: newId(), ...fields, ...review, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
        await repos.courses.insert(rec);
        return rec;
      }
      const next = await repos.courses.update(cur.id, { ...fields, ...review, updatedBy: ctx.userId, updatedAt: now }, version ?? cur.version);
      if (!next) throw new AppError("VERSION_CONFLICT", "This course was changed by someone else");
      return next;
    },
    /** Loads the seed articles (idempotent: existing slugs are left alone). Health and biosecurity seeds need sources. */
    async seed() {
      const now = clock.now();
      let created = 0;
      for (const a of SEED_ARTICLES) {
        assertPublishable(a);
        if (await repos.articles.findBySlug(a.slug, a.locale)) continue;
        await repos.articles.insert({ ...a, id: newId(), createdAt: now, updatedAt: now, version: 0 });
        created++;
      }
      return { articles: SEED_ARTICLES.length, created };
    }
  };
}

// src/services/hatchery.service.ts
var LAYING_FLOCKS = /* @__PURE__ */ new Set(["layer", "breeder", "custom"]);
var OPEN_ORDER = /* @__PURE__ */ new Set(["pending", "accepted", "preparing", "dispatched"]);
function createHatcheryService(d) {
  const { repos, clock } = d;
  const E = d.inventory.engine;
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
  const strip = ({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  const toHatchEvent = (e) => ({ id: e.id, type: e.type, date: e.date, ...e.counts ? { counts: e.counts } : {}, ...e.reversalOf ? { reversalOf: e.reversalOf } : {} });
  const sortEvents2 = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.getTime() - b.createdAt.getTime();
  async function loadBatch(ctx, id, tx) {
    const b = await repos.hatcheryBatches.findById(ctx.farmId, id, tx);
    if (!b) throw notFound("Hatchery batch");
    return b;
  }
  const loadEvents = async (ctx, batchId, tx) => (await repos.hatcheryEvents.find(ctx.farmId, { where: { batchId } }, tx)).sort(sortEvents2);
  function snapshot(b, events) {
    const c = batchCounts(b.eggsSet, events.map(toHatchEvent));
    const m = hatcheryMetrics(c);
    const status = c.stage === "incubating" ? "incubating" : c.stage === "in_hatcher" ? "in_hatcher" : "hatched";
    return {
      status,
      results: defined({
        infertile: c.infertile,
        cracked: c.cracked,
        deadEmbryo: c.deadEmbryo,
        transferred: c.transferred ?? void 0,
        hatched: c.hatched,
        deadInShell: c.deadInShell,
        culled: c.culled,
        saleable: c.saleable,
        inIncubation: c.inIncubation,
        fertilityPercent: m.fertilityPercent ?? void 0,
        hatchabilityPercent: m.hatchabilityPercent ?? void 0,
        saleableChickPercent: m.saleableChickPercent ?? void 0,
        lossPercent: m.lossPercent ?? void 0
      }),
      counts: c,
      metrics: m
    };
  }
  async function batchView(ctx, b, events, tx) {
    const ev = events ?? await loadEvents(ctx, b.id, tx);
    const s2 = snapshot(b, ev);
    const booked = (await repos.orders.find(ctx.farmId, { where: { hatcheryBatchId: b.id } }, tx)).filter((o) => OPEN_ORDER.has(o.status)).reduce((t, o) => t + o.lines.reduce((x, l) => x + l.quantity, 0), 0);
    return { ...strip(b), counts: s2.counts, metrics: s2.metrics, chicksBooked: booked };
  }
  async function lotAvailability(ctx, lot, excludeOrderId, tx) {
    const batchIds = lot.hatcheryBatchId ? [lot.hatcheryBatchId] : [];
    const orders = await repos.orders.find(ctx.farmId, { where: { status: [...OPEN_ORDER] } }, tx);
    const reserved = orders.filter((o) => o.id !== excludeOrderId).flatMap((o) => o.lines.filter((l) => l.chickLotId === lot.id || !l.chickLotId && o.hatcheryBatchId && batchIds.includes(o.hatcheryBatchId))).reduce((t, l) => t + l.quantity, 0);
    return { remaining: lot.remaining, reserved, available: lot.remaining - reserved };
  }
  async function append(ctx, farm, b, events, draft, patch, tx) {
    if (draft.date > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${draft.date} is in the future for this farm`);
    if (draft.date < b.setDate) throw new AppError("VALIDATION_FAILED", `${draft.date} is before the eggs were set on ${b.setDate}`);
    const counted = effectiveHatchEvents(events.map(toHatchEvent)).filter((e) => e.type !== "set" && e.counts);
    const last = counted[counted.length - 1];
    if (draft.counts && last && draft.date < last.date) throw new AppError("VALIDATION_FAILED", `${draft.date} is before the last recorded stage (${last.date})`);
    const now = clock.now();
    const rec = { id: newId(), farmId: ctx.farmId, batchId: b.id, createdBy: ctx.userId, createdAt: now, updatedAt: now, ...defined(draft) };
    if (rec.type !== "reversal") assertHatchEventAllowed(b.eggsSet, events.map(toHatchEvent), toHatchEvent(rec));
    await repos.hatcheryEvents.insert(rec, tx);
    const all = [...events, rec];
    const s2 = snapshot(b, all);
    const next = await repos.hatcheryBatches.update(ctx.farmId, b.id, { status: s2.status, results: s2.results, ...patch, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: b.version }, tx);
    if (!next) throw new AppError("VERSION_CONFLICT", "This batch was changed at the same time by someone else. Reload and try again.");
    await d.audit.record(ctx, { action: `hatchery.${rec.type}`, entity: "hatchery_batch", entityId: b.id, after: { date: rec.date, counts: rec.counts } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "hatchery_batch", entityId: b.id, op: "upsert", version: next.version }, tx);
    return { batch: next, event: rec, events: all };
  }
  const orderView = (o, buyer) => ({ ...strip(o), quantity: o.lines.reduce((t, l) => t + l.quantity, 0), ...buyer ? { buyerName: buyer.name } : {} });
  return {
    // ---- batches
    /**
     * Egg source → selection → setting, in one step. Own-flock eggs are drawn from egg stock (the given grade, or
     * ungraded). Rejected eggs are not set; expected transfer and hatch dates follow the species' incubation period.
     */
    async createBatch(ctx, input) {
      assertCan(ctx, "hatchery.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        if (input.setDate > E.todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${input.setDate} is in the future for this farm`);
        const rejected = Object.values(input.rejects ?? {}).reduce((t, n) => t + (n ?? 0), 0);
        const eggsSet = input.eggsReceived - rejected;
        if (eggsSet < 1) throw new AppError("VALIDATION_FAILED", `All ${input.eggsReceived} eggs were rejected at selection; nothing to set`);
        E.assertCurrency(input.eggCost, farm, "eggCost");
        E.assertCurrency(input.otherCost, farm, "otherCost");
        if (input.incubatorId) {
          const eq = await repos.equipment.findById(ctx.farmId, input.incubatorId, tx);
          if (!eq) throw notFound("Incubator");
          if (eq.type !== "incubator" && eq.type !== "hatcher") throw new AppError("VALIDATION_FAILED", `${eq.name} is not an incubator`);
        }
        const id = input.id ?? newId();
        const now = clock.now();
        if (input.eggSource === "own_flock") {
          if (!input.sourceFlockId) throw new AppError("VALIDATION_FAILED", "Name the flock the eggs came from");
          const flock = await repos.flocks.findById(ctx.farmId, input.sourceFlockId, tx);
          if (!flock) throw notFound("Flock");
          if (!LAYING_FLOCKS.has(flock.type)) throw new AppError("VALIDATION_FAILED", `${flock.flockCode} is a ${flock.type} flock and does not lay hatching eggs`);
          const stock = await d.inventory.eggStock(ctx, tx);
          const bucket = input.eggGrade ?? "ungraded";
          const available = stock.byGrade[bucket] ?? 0;
          if (input.eggsReceived > available) throw new AppError("INSUFFICIENT_STOCK", `Only ${available} ${bucket} eggs in stock`, { available, requested: input.eggsReceived });
          await repos.eggInventory.insert(
            { id: newId(), farmId: ctx.farmId, date: input.setDate, type: "used", ...input.eggGrade ? { grade: input.eggGrade } : {}, quantityDelta: -input.eggsReceived, flockId: flock.id, sourceType: "hatchery_batch", sourceId: id, note: `Hatching eggs for batch ${input.code}`, createdBy: ctx.userId, createdAt: now, updatedAt: now },
            tx
          );
        }
        const days = input.incubationDays ?? INCUBATION_DAYS[input.species];
        const b = {
          id,
          farmId: ctx.farmId,
          ...defined({ code: input.code, species: input.species, breed: input.breed, eggSource: input.eggSource, sourceFlockId: input.sourceFlockId, eggGrade: input.eggGrade, supplier: input.supplier, incubatorId: input.incubatorId, eggCost: input.eggCost, otherCost: input.otherCost, notes: input.notes }),
          eggsReceived: input.eggsReceived,
          ...rejected ? { rejects: Object.fromEntries(Object.entries(input.rejects).filter(([, n]) => (n ?? 0) > 0)) } : {},
          eggsSet,
          setDate: input.setDate,
          incubationDays: days,
          expectedTransferDate: expectedTransferDate(input.setDate, days),
          expectedHatchDate: addDays(input.setDate, days),
          status: "incubating",
          results: { infertile: 0, cracked: 0, deadEmbryo: 0, hatched: 0, deadInShell: 0, culled: 0, saleable: 0, inIncubation: eggsSet },
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.hatcheryBatches.insert(b, tx).catch(duplicate(`Batch code "${input.code}"`));
        const setEvent = { id: newId(), farmId: ctx.farmId, batchId: id, type: "set", date: input.setDate, ...input.incubatorId ? { machine: "setter" } : {}, createdBy: ctx.userId, createdAt: now, updatedAt: now };
        await repos.hatcheryEvents.insert(setEvent, tx);
        await d.audit.record(ctx, { action: "hatchery.batch_set", entity: "hatchery_batch", entityId: id, after: { code: b.code, eggsReceived: b.eggsReceived, eggsSet, expectedHatchDate: b.expectedHatchDate } }, tx);
        return batchView(ctx, b, [setEvent], tx);
      });
    },
    async recordCandling(ctx, id, r) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This batch is cancelled");
        const out = await append(ctx, farm, b, await loadEvents(ctx, id, tx), { type: "candling", date: r.date, counts: { infertile: r.infertile, deadEmbryo: r.deadEmbryo, cracked: r.cracked }, machine: "setter", ...r.note ? { note: r.note } : {} }, {}, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },
    async recordTransfer(ctx, id, r) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This batch is cancelled");
        if (r.hatcherId && !await repos.equipment.findById(ctx.farmId, r.hatcherId, tx)) throw notFound("Hatcher");
        const out = await append(ctx, farm, b, await loadEvents(ctx, id, tx), { type: "transfer_to_hatcher", date: r.date, counts: { cracked: r.cracked, deadEmbryo: r.deadEmbryo }, machine: "hatcher", ...r.note ? { note: r.note } : {} }, r.hatcherId ? { hatcherId: r.hatcherId } : {}, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },
    /** The hatch. Eggs that did not hatch are dead in shell; if not given, the remainder is counted as such. */
    async recordHatch(ctx, id, r) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This batch is cancelled");
        const events = await loadEvents(ctx, id, tx);
        const inMachine = batchCounts(b.eggsSet, events.map(toHatchEvent)).inIncubation;
        const deadInShell = r.deadInShell ?? inMachine - r.hatched;
        const out = await append(ctx, farm, b, events, { type: "hatch", date: r.date, counts: { hatched: r.hatched, deadInShell }, machine: "hatcher", ...r.note ? { note: r.note } : {} }, {}, tx);
        await d.alerts.resolve(ctx, `hatch_due:${id}`, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },
    /** Grading splits hatched chicks into saleable and culled; saleable chicks become a chick lot. */
    async recordGrading(ctx, id, r) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        const events = await loadEvents(ctx, id, tx);
        const now = clock.now();
        const costMinor = (b.eggCost?.amountMinor ?? 0) + (b.otherCost?.amountMinor ?? 0);
        const hatchDate = effectiveHatchEvents(events.map(toHatchEvent)).find((e) => e.type === "hatch")?.date ?? r.date;
        const lot = {
          id: newId(),
          farmId: ctx.farmId,
          source: "own_hatchery",
          hatcheryBatchId: b.id,
          species: b.species,
          ...b.breed ? { breed: b.breed } : {},
          hatchDate,
          quantity: r.saleable,
          remaining: r.saleable,
          status: r.saleable > 0 ? "available" : "depleted",
          ...costMinor > 0 && r.saleable > 0 ? { unitCost: { amountMinor: Math.round(costMinor / r.saleable), currency: farm.settings.currency } } : {},
          notes: `From hatchery batch ${b.code}`,
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        const out = await append(ctx, farm, b, events, { type: "chick_grading", date: r.date, counts: { saleable: r.saleable, culled: r.culled }, chickLotId: lot.id, ...r.note ? { note: r.note } : {} }, { chickLotId: lot.id }, tx);
        await repos.chickLots.insert(lot, tx);
        return { batch: await batchView(ctx, out.batch, out.events, tx), chickLot: strip(lot) };
      });
    },
    async recordReading(ctx, id, r) {
      assertCan(ctx, "hatchery.record");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        const out = await append(ctx, farm, b, await loadEvents(ctx, id, tx), { type: r.temperatureC !== void 0 || r.humidityPercent !== void 0 ? "environment_reading" : "note", ...defined(r) }, {}, tx);
        return strip(out.event);
      });
    },
    /** Undoes the latest stage. A grading can be undone only while its chick lot is untouched and unbooked. */
    async reverseLatest(ctx, id, reason) {
      assertCan(ctx, "hatchery.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        const events = await loadEvents(ctx, id, tx);
        const target = reversibleHatchEvent(events.map(toHatchEvent));
        if (!target) throw new AppError("INVALID_STATE_TRANSITION", "There is nothing to undo on this batch");
        let patch = {};
        if (target.type === "chick_grading" && b.chickLotId) {
          const lot = await repos.chickLots.findById(ctx.farmId, b.chickLotId, tx);
          if (lot && (lot.remaining !== lot.quantity || (lot.placedFlockIds?.length ?? 0) > 0)) throw new AppError("INVALID_STATE_TRANSITION", "Chicks from this grading have already been placed or sold; it cannot be undone");
          if (lot && (await lotAvailability(ctx, lot, void 0, tx)).reserved > 0) throw new AppError("INVALID_STATE_TRANSITION", "Chicks from this grading are booked on orders; cancel or move the orders first");
          if (lot) await repos.chickLots.update(ctx.farmId, lot.id, { status: "closed", deletedAt: clock.now(), deletedBy: ctx.userId, updatedAt: clock.now() }, void 0, tx);
          patch = { chickLotId: void 0 };
        }
        const today = E.todayOf(farm);
        const out = await append(ctx, farm, b, events, { type: "reversal", date: today < b.setDate ? b.setDate : today, reversalOf: target.id, note: reason }, patch, tx);
        return batchView(ctx, out.batch, out.events, tx);
      });
    },
    /** A batch can be cancelled before it hatches (power failure, contamination). The eggs set are written off. */
    async cancelBatch(ctx, id, reason) {
      assertCan(ctx, "hatchery.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        const b = await loadBatch(ctx, id, tx);
        if (b.status !== "incubating" && b.status !== "in_hatcher") throw new AppError("INVALID_STATE_TRANSITION", `A ${b.status} batch cannot be cancelled`);
        const events = await loadEvents(ctx, id, tx);
        const now = clock.now();
        await repos.hatcheryEvents.insert({ id: newId(), farmId: ctx.farmId, batchId: id, type: "cancelled", date: E.todayOf(farm), note: reason, createdBy: ctx.userId, createdAt: now, updatedAt: now }, tx);
        const next = await repos.hatcheryBatches.update(ctx.farmId, id, { status: "cancelled", cancelledReason: reason, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: b.version }, tx);
        await d.alerts.resolve(ctx, `hatch_due:${id}`, tx);
        await d.audit.record(ctx, { action: "hatchery.cancelled", entity: "hatchery_batch", entityId: id, after: { reason } }, tx);
        return batchView(ctx, next, events, tx);
      });
    },
    async getBatch(ctx, id) {
      assertCan(ctx, "hatchery.read");
      const b = await loadBatch(ctx, id);
      const events = await loadEvents(ctx, id);
      const reversed = new Set(events.filter((e) => e.reversalOf).map((e) => e.reversalOf));
      return { ...await batchView(ctx, b, events), events: events.map((e) => ({ ...strip(e), reversed: reversed.has(e.id) })) };
    },
    async listBatches(ctx, q8) {
      assertCan(ctx, "hatchery.read");
      const rows = await repos.hatcheryBatches.find(ctx.farmId, { ...q8.status ? { where: { status: q8.status } } : {}, sort: [{ field: "setDate", dir: -1 }] });
      return Promise.all(rows.map((b) => batchView(ctx, b)));
    },
    /** Hatchery performance over completed batches (incubating ones never drag the rate down; audit B27). */
    async summary(ctx, q8) {
      assertCan(ctx, "hatchery.read");
      const rows = await repos.hatcheryBatches.find(ctx.farmId, { range: { field: "setDate", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} } });
      const live = rows.filter((b) => b.status !== "cancelled");
      const done = live.filter((b) => b.status === "hatched");
      const sum2 = (f) => done.reduce((t, b) => t + f(b), 0);
      const eggsSet = sum2((b) => b.eggsSet);
      const cracked = sum2((b) => b.results?.cracked ?? 0);
      const fertile = eggsSet - cracked - sum2((b) => b.results?.infertile ?? 0);
      const hatched = sum2((b) => b.results?.hatched ?? 0);
      const graded = done.filter((b) => (b.results?.saleable ?? 0) + (b.results?.culled ?? 0) > 0);
      const gradedSet = graded.reduce((t, b) => t + b.eggsSet, 0);
      const saleable = graded.reduce((t, b) => t + (b.results?.saleable ?? 0), 0);
      const pct = (a, b) => b > 0 ? a / b * 100 : null;
      return {
        batches: { incubating: live.filter((b) => b.status === "incubating" || b.status === "in_hatcher").length, hatched: done.length, cancelled: rows.length - live.length },
        eggsIncubating: live.filter((b) => b.status !== "hatched").reduce((t, b) => t + (b.results?.inIncubation ?? b.eggsSet), 0),
        completed: {
          eggsSet,
          hatched,
          saleable,
          fertilityPercent: pct(fertile, eggsSet - cracked),
          hatchabilityPercent: pct(hatched, fertile),
          hatchOfSetPercent: overallHatchOfSet(done.map((b) => ({ eggsSet: b.eggsSet, hatched: b.results?.hatched ?? 0 }))),
          saleableChickPercent: pct(saleable, gradedSet),
          lossPercent: gradedSet > 0 ? pct(gradedSet - saleable, gradedSet) : null
        }
      };
    },
    /** Hourly: a hatch due today or overdue that has not been recorded. */
    async evaluateAlerts(ctx, tx) {
      const farm = await E.farmOf(ctx, tx);
      const today = E.todayOf(farm);
      for (const b of await repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] }, range: { field: "expectedHatchDate", to: today } }, tx)) {
        await d.alerts.raise(ctx, { ruleType: "hatch_due", severity: b.expectedHatchDate < today ? "warning" : "info", title: `Hatch ${b.expectedHatchDate < today ? "overdue" : "due today"}: batch ${b.code}`, message: `Batch ${b.code} (${b.eggsSet} eggs set on ${b.setDate}) was expected to hatch on ${b.expectedHatchDate}. Record the hatch when it is done.`, dedupKey: `hatch_due:${b.id}`, date: today }, tx);
      }
    },
    // ---- buyers and chick orders
    async createBuyer(ctx, r) {
      assertCan(ctx, "market.manage");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(r), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.buyers.insert(rec);
      return strip(rec);
    },
    async listBuyers(ctx) {
      assertCan(ctx, "market.read");
      return (await repos.buyers.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    /**
     * A chick order: from a chick lot (checked against chicks not already booked) or booked against a batch still
     * incubating (drawn from that batch's lot at delivery). Prices come from the farm, in the farm currency.
     */
    /** Status changes (accept, dispatch, deliver, cancel, complete) go through the marketplace order state machine. */
    async createChickOrder(ctx, r) {
      assertCan(ctx, "market.manage");
      return repos.tx.run(async (tx) => {
        const farm = await E.farmOf(ctx, tx);
        E.assertCurrency(r.unitPrice, farm, "unitPrice");
        const buyer = await repos.buyers.findById(ctx.farmId, r.buyerId, tx);
        if (!buyer) throw notFound("Buyer");
        let description = "Day-old chicks";
        if (r.chickLotId) {
          const lot = await repos.chickLots.findById(ctx.farmId, r.chickLotId, tx);
          if (!lot) throw notFound("Chick lot");
          const a = await lotAvailability(ctx, lot, void 0, tx);
          if (r.quantity > a.available) throw new AppError("INSUFFICIENT_STOCK", `Only ${a.available} chicks are free in that lot (${a.reserved} already booked)`, a);
          description = `Day-old chicks${lot.breed ? ` (${lot.breed})` : ""}, hatched ${lot.hatchDate}`;
        } else if (r.hatcheryBatchId) {
          const b = await loadBatch(ctx, r.hatcheryBatchId, tx);
          if (b.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "That batch is cancelled");
          if (b.chickLotId) throw new AppError("VALIDATION_FAILED", "That batch is already graded; order from its chick lot");
          description = `Day-old chicks from batch ${b.code}, expected ${b.expectedHatchDate}`;
        }
        const now = clock.now();
        const total = { amountMinor: Math.round(r.unitPrice.amountMinor * r.quantity), currency: farm.settings.currency };
        const order = {
          id: newId(),
          farmId: ctx.farmId,
          orderNumber: await repos.counters.next("order", ctx.farmId, tx),
          channel: "direct",
          buyerId: buyer.id,
          ...r.hatcheryBatchId ? { hatcheryBatchId: r.hatcheryBatchId } : {},
          lines: [{ category: "day_old_chicks", description, ...r.chickLotId ? { chickLotId: r.chickLotId } : {}, quantity: r.quantity, unit: "chick", unitPrice: r.unitPrice, total }],
          subtotal: total,
          total,
          status: "pending",
          statusHistory: [{ status: "pending", at: now, by: ctx.userId }],
          paymentStatus: "unpaid",
          fulfilment: r.fulfilment ?? "pickup",
          ...defined({ requestedDeliveryDate: r.requestedDeliveryDate, deliveryAddress: r.deliveryAddress, notes: r.notes }),
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.orders.insert(order, tx);
        await d.audit.record(ctx, { action: "order.created", entity: "order", entityId: order.id, after: { orderNumber: order.orderNumber, quantity: r.quantity, total } }, tx);
        return orderView(order, buyer);
      });
    },
    async listOrders(ctx, q8) {
      assertCan(ctx, "market.read");
      const rows = await repos.orders.find(ctx.farmId, { ...q8.status ? { where: { status: q8.status } } : {}, sort: [{ field: "createdAt", dir: -1 }] });
      const buyers = new Map((await repos.buyers.find(ctx.farmId)).map((b) => [b.id, b]));
      return rows.filter((o) => (!q8.from || (o.requestedDeliveryDate ?? "") >= q8.from) && (!q8.to || (o.requestedDeliveryDate ?? "9999") <= q8.to)).map((o) => orderView(o, o.buyerId ? buyers.get(o.buyerId) : void 0));
    },
    lotAvailability
  };
}

// src/services/chickstart.service.ts
function createChickStartService(d) {
  const { repos, clock } = d;
  const L = d.flocks.ledger;
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
  const strip = ({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  async function profileFor(ctx, flock) {
    const arrival = (await repos.chickArrivals.find(ctx.farmId, { where: { flockId: flock.id }, limit: 1 }))[0];
    if (arrival?.broodingProfileId) {
      const p6 = await repos.broodingProfiles.findById(ctx.farmId, arrival.broodingProfileId);
      if (p6) return p6;
    }
    const profiles = await repos.broodingProfiles.find(ctx.farmId, { where: { isDefault: true } });
    return profiles.find((p6) => !p6.flockTypes?.length || p6.flockTypes.includes(flock.type)) ?? null;
  }
  const ageOf = (flock, date) => ageDays({ ...flock.hatchDate ? { hatchDate: flock.hatchDate } : {}, ...flock.placementDate ? { placementDate: flock.placementDate } : {}, ...flock.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {} }, date);
  return {
    // ---- brooding profiles
    async createProfile(ctx, r) {
      assertCan(ctx, "flock.manage");
      assertBands(r.bands);
      return repos.tx.run(async (tx) => {
        if (r.isDefault) {
          for (const p6 of await repos.broodingProfiles.find(ctx.farmId, { where: { isDefault: true } }, tx)) await repos.broodingProfiles.update(ctx.farmId, p6.id, { isDefault: false, updatedAt: clock.now() }, void 0, tx);
        }
        const now = clock.now();
        const rec = { id: newId(), farmId: ctx.farmId, ...defined({ name: r.name, flockTypes: r.flockTypes, source: r.source }), bands: [...r.bands].sort((a, b) => a.fromDay - b.fromDay).map((b) => defined(b)), isDefault: r.isDefault, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
        await repos.broodingProfiles.insert(rec, tx).catch(duplicate(`A profile named "${r.name}"`));
        await d.audit.record(ctx, { action: "brooding_profile.created", entity: "brooding_profile", entityId: rec.id, after: { name: rec.name, bands: rec.bands.length, source: rec.source } }, tx);
        return strip(rec);
      });
    },
    async listProfiles(ctx) {
      assertCan(ctx, "production.read");
      return (await repos.broodingProfiles.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    // ---- arrivals
    async planArrival(ctx, r) {
      assertCan(ctx, "flock.manage");
      if (!await repos.houses.findById(ctx.farmId, r.houseId)) throw notFound("House");
      if (r.source === "own_hatchery") {
        if (!r.hatcheryBatchId) throw new AppError("VALIDATION_FAILED", "Name the hatchery batch the chicks come from");
        if (!await repos.hatcheryBatches.findById(ctx.farmId, r.hatcheryBatchId)) throw notFound("Hatchery batch");
      }
      if (r.source === "chick_lot") {
        if (!r.chickLotId) throw new AppError("VALIDATION_FAILED", "Name the chick lot");
        const lot = await repos.chickLots.findById(ctx.farmId, r.chickLotId);
        if (!lot) throw notFound("Chick lot");
        if (r.expectedCount > lot.remaining) throw new AppError("INSUFFICIENT_STOCK", `Only ${lot.remaining} chicks left in that lot`, { available: lot.remaining });
      }
      if (r.broodingProfileId && !await repos.broodingProfiles.findById(ctx.farmId, r.broodingProfileId)) throw notFound("Brooding profile");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(r), status: "planned", createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.chickArrivals.insert(rec, tx);
        await d.audit.record(ctx, { action: "arrival.planned", entity: "chick_arrival", entityId: rec.id, after: { expectedDate: rec.expectedDate, expectedCount: rec.expectedCount } }, tx);
      });
      return strip(rec);
    },
    async listArrivals(ctx, q8) {
      assertCan(ctx, "production.read");
      return (await repos.chickArrivals.find(ctx.farmId, { ...q8.status ? { where: { status: q8.status } } : {}, sort: [{ field: "expectedDate", dir: 1 }] })).map((a) => ({ ...strip(a), prepared: !!a.preparation }));
    },
    /** House and arrival preparation, answered against the farm's own checklist. Failed items create corrective actions. */
    async completePreparation(ctx, id, checklist) {
      assertCan(ctx, "production.record");
      return repos.tx.run(async (tx) => {
        const a = await repos.chickArrivals.findById(ctx.farmId, id, tx);
        if (!a) throw notFound("Arrival");
        if (a.status !== "planned") throw new AppError("INVALID_STATE_TRANSITION", `This arrival is ${a.status}`);
        const farm = await L.farmOf(ctx, tx);
        const result = await d.biosecurity.runChecklist(ctx, checklist, ["arrival_preparation", "general"], { entity: "chick_arrival", id, date: L.todayOf(farm), houseId: a.houseId, label: "Arrival preparation" }, tx);
        const next = await repos.chickArrivals.update(ctx.farmId, id, { preparation: { checklist: result, completedAt: clock.now(), completedBy: ctx.userId }, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: a.version }, tx);
        return { ...strip(next), prepared: true };
      });
    },
    /**
     * The chicks arrive: records count, dead on arrival, chick weight and quality, then places them into a new flock
     * in the same transaction (drawing the chick lot when they come from inventory or the farm's hatchery).
     */
    async arrive(ctx, id, r) {
      assertCan(ctx, "flock.manage");
      return repos.tx.run(async (tx) => {
        const a = await repos.chickArrivals.findById(ctx.farmId, id, tx);
        if (!a) throw notFound("Arrival");
        if (a.status !== "planned") throw new AppError("INVALID_STATE_TRANSITION", `This arrival is ${a.status}`);
        if (r.deadOnArrival > r.received) throw new AppError("VALIDATION_FAILED", "Dead on arrival cannot exceed chicks received");
        const farm = await L.farmOf(ctx, tx);
        const arrivedAt = r.arrivedAt ? new Date(r.arrivedAt) : clock.now();
        const date = localDateOf(arrivedAt, farm.settings.timezone);
        let chickLotId = a.chickLotId;
        let hatchDate;
        if (a.source === "own_hatchery") {
          const b = await repos.hatcheryBatches.findById(ctx.farmId, a.hatcheryBatchId, tx);
          if (!b?.chickLotId) throw new AppError("INVALID_STATE_TRANSITION", "That batch has not been graded yet, so its chicks are not in stock");
          chickLotId = b.chickLotId;
        }
        if (chickLotId) hatchDate = (await repos.chickLots.findById(ctx.farmId, chickLotId, tx))?.hatchDate;
        const checklist = r.checklist ? await d.biosecurity.runChecklist(ctx, r.checklist, ["arrival_preparation", "general"], { entity: "chick_arrival", id, date, houseId: a.houseId, label: "Chick arrival" }, tx) : void 0;
        const flock = await d.flocks.create(ctx, {
          name: r.flock.name,
          flockCode: r.flock.flockCode,
          type: a.flockType,
          species: "chicken",
          houseId: a.houseId,
          ...a.breed ? { breed: a.breed } : {},
          ...a.supplier ? { source: a.supplier } : {},
          ...hatchDate ? { hatchDate } : {},
          placement: {
            date,
            count: r.received,
            deadOnArrival: r.deadOnArrival,
            ...r.averageWeightG ? { startingWeightG: r.averageWeightG } : {},
            ...r.flock.chickCost ? { chickCost: r.flock.chickCost } : {},
            ageDaysAtPlacement: 0,
            ...chickLotId ? { chickLotId } : {}
          }
        });
        const next = await repos.chickArrivals.update(
          ctx.farmId,
          id,
          { status: "arrived", flockId: flock.id, arrival: defined({ arrivedAt, received: r.received, deadOnArrival: r.deadOnArrival, averageWeightG: r.averageWeightG, sampleSize: r.sampleSize, qualityNotes: r.qualityNotes, checklist }), updatedBy: ctx.userId, updatedAt: clock.now() },
          { expectedVersion: a.version },
          tx
        );
        await d.audit.record(ctx, { action: "arrival.received", entity: "chick_arrival", entityId: id, after: { received: r.received, deadOnArrival: r.deadOnArrival, flockId: flock.id } }, tx);
        return { arrival: { ...strip(next), prepared: !!a.preparation }, flock };
      });
    },
    async cancelArrival(ctx, id, reason) {
      assertCan(ctx, "flock.manage");
      const a = await repos.chickArrivals.findById(ctx.farmId, id);
      if (!a) throw notFound("Arrival");
      if (a.status !== "planned") throw new AppError("INVALID_STATE_TRANSITION", `This arrival is ${a.status}`);
      return strip(await repos.chickArrivals.update(ctx.farmId, id, { status: "cancelled", cancelledReason: reason, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: a.version }));
    },
    // ---- brooder checks
    /** A brooder check, judged against the farm's brooding profile for the chicks' age. Out-of-range readings raise an alert. */
    async recordCheck(ctx, r) {
      assertCan(ctx, "production.record");
      if (r.cropFill && r.cropFill.full > r.cropFill.sampled) throw new AppError("VALIDATION_FAILED", "More full crops than chicks sampled");
      return repos.tx.run(async (tx) => {
        const farm = await L.farmOf(ctx, tx);
        const flock = await L.loadFlock(ctx, r.flockId, tx);
        L.assertStatus(flock, ["active"], "record a brooder check");
        const checkedAt = r.checkedAt ? new Date(r.checkedAt) : clock.now();
        if (checkedAt.getTime() > clock.now().getTime() + 5 * 6e4) throw new AppError("VALIDATION_FAILED", "The check time is in the future");
        const date = localDateOf(checkedAt, farm.settings.timezone);
        L.assertDate(date, farm, flock);
        const dayOfAge = ageOf(flock, date) ?? 0;
        const profile = await profileFor(ctx, flock);
        const evalResult = evaluateBrooderCheck({ dayOfAge, ...defined({ temperatureC: r.temperatureC, humidityPercent: r.humidityPercent, behaviour: r.behaviour, feedAvailable: r.feedAvailable, waterAvailable: r.waterAvailable }) }, profile?.bands);
        const id = newId();
        const checklist = r.checklist ? await d.biosecurity.runChecklist(ctx, r.checklist, ["brooder_check", "general"], { entity: "brooder_check", id, date, houseId: flock.houseId, label: `Brooder check ${flock.flockCode}` }, tx) : void 0;
        const now = clock.now();
        const rec = {
          id,
          farmId: ctx.farmId,
          flockId: flock.id,
          houseId: flock.houseId,
          checkedAt,
          date,
          dayOfAge,
          ...defined({ temperatureC: r.temperatureC, humidityPercent: r.humidityPercent, behaviour: r.behaviour, feedAvailable: r.feedAvailable, waterAvailable: r.waterAvailable, cropFill: r.cropFill, notes: r.notes }),
          ...checklist ? { checklist } : {},
          ...evalResult.flags.length ? { flags: evalResult.flags } : {},
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.brooderChecks.insert(rec, tx);
        if (evalResult.flags.length) {
          const words = {
            temperature_low: `temperature ${r.temperatureC} \xB0C is below ${evalResult.band?.tempMinC} \xB0C`,
            temperature_high: `temperature ${r.temperatureC} \xB0C is above ${evalResult.band?.tempMaxC} \xB0C`,
            humidity_low: `humidity ${r.humidityPercent}% is below ${evalResult.band?.humidityMin}%`,
            humidity_high: `humidity ${r.humidityPercent}% is above ${evalResult.band?.humidityMax}%`,
            behaviour: `chicks are ${r.behaviour?.replace("_", " ")}`,
            no_feed: "feed was not available",
            no_water: "water was not available"
          };
          const urgent = evalResult.flags.some((f) => f === "no_water" || f === "no_feed");
          await d.alerts.raise(ctx, {
            ruleType: "brooding_conditions",
            severity: urgent ? "critical" : "warning",
            title: `Brooding: ${flock.flockCode}, day ${dayOfAge}`,
            message: `${flock.flockCode} (day ${dayOfAge}): ${evalResult.flags.map((f) => words[f]).join("; ")}${profile ? ` (targets from "${profile.name}")` : ""}.`,
            dedupKey: `brooding:${flock.id}:${date}`,
            date,
            flockId: flock.id,
            houseId: flock.houseId
          }, tx);
        }
        return { ...strip(rec), profile: profile ? { id: profile.id, name: profile.name, band: evalResult.band } : null };
      });
    },
    /**
     * The brooding period day by day (default the first 14 days): deaths, culls, feed, water, conditions from the
     * daily record, weight against the profile target, and brooder checks with their flags.
     */
    async broodingView(ctx, flockId, q8) {
      assertCan(ctx, "production.read");
      const farm = await L.farmOf(ctx);
      const flock = await L.loadFlock(ctx, flockId);
      if (!flock.placementDate) throw new AppError("INVALID_STATE_TRANSITION", "This flock has not been placed yet");
      const today = L.todayOf(farm);
      const last = [addDays(flock.placementDate, q8.days - 1), today, flock.closedDate ?? today].sort()[0];
      const days = last >= flock.placementDate ? dateRange(flock.placementDate, last) : [];
      const range = { field: "date", from: flock.placementDate, to: last };
      const [events, records, feed, water, checks, profile, arrival] = await Promise.all([
        L.loadEvents(ctx, flockId),
        repos.dailyRecords.find(ctx.farmId, { where: { flockId }, range }),
        repos.feedConsumption.find(ctx.farmId, { where: { flockId }, range }),
        repos.waterRecords.find(ctx.farmId, { where: { flockId }, range }),
        repos.brooderChecks.find(ctx.farmId, { where: { flockId }, range }),
        profileFor(ctx, flock),
        repos.chickArrivals.find(ctx.farmId, { where: { flockId }, limit: 1 })
      ]);
      const ledger = events.map(toLedger);
      const live = effectiveEvents(ledger);
      const rows = days.map((date) => {
        const dayOfAge = ageOf(flock, date) ?? 0;
        const rec = records.find((x) => x.date === date);
        const dayChecks = checks.filter((c) => c.date === date);
        const weighing = live.filter((e) => e.type === "weighing" && e.date === date).pop();
        const band = profile?.bands.find((b) => dayOfAge >= b.fromDay && dayOfAge <= b.toDay);
        const sum2 = (type) => live.filter((e) => e.type === type && e.date === date).reduce((t, e) => t + (e.birds ?? 0), 0);
        return {
          date,
          dayOfAge,
          birdsAlive: population(ledger, date).alive,
          mortality: sum2("mortality"),
          culls: sum2("cull"),
          feedKg: Math.round(feed.filter((f) => f.date === date && (f.kind ?? "consumption") === "consumption").reduce((t, f) => t + f.quantityKg, 0) * 1e3) / 1e3,
          waterLitres: water.find((w) => w.date === date)?.litres ?? null,
          temperatureMinC: rec?.temperatureMinC ?? null,
          temperatureMaxC: rec?.temperatureMaxC ?? null,
          humidityPercent: rec?.humidityPercent ?? null,
          averageWeightG: weighing?.averageWeightG ?? null,
          targetWeightG: band?.targetWeightG ?? null,
          brooderChecks: dayChecks.length,
          flaggedChecks: dayChecks.filter((c) => c.flags?.length).length,
          checklistFailures: dayChecks.reduce((t, c) => t + (c.checklist?.failedCount ?? 0), 0),
          cropFillPercent: (() => {
            const cf = dayChecks.filter((c) => c.cropFill);
            const s2 = cf.reduce((t, c) => t + c.cropFill.sampled, 0);
            return s2 > 0 ? cf.reduce((t, c) => t + c.cropFill.full, 0) / s2 * 100 : null;
          })(),
          dailyRecordId: rec?.id ?? null
        };
      });
      const placed = population(ledger).placed;
      const mortalityInPeriod = rows.reduce((t, r) => t + r.mortality, 0);
      return {
        flockId,
        flockCode: flock.flockCode,
        placementDate: flock.placementDate,
        profile: profile ? { id: profile.id, name: profile.name, source: profile.source ?? null } : null,
        arrival: arrival[0] ? { id: arrival[0].id, received: arrival[0].arrival?.received ?? null, deadOnArrival: arrival[0].arrival?.deadOnArrival ?? null, averageWeightG: arrival[0].arrival?.averageWeightG ?? null, prepared: !!arrival[0].preparation } : null,
        days: rows,
        totals: {
          mortality: mortalityInPeriod,
          mortalityPercent: placed > 0 ? mortalityInPeriod / placed * 100 : null,
          daysRecorded: rows.filter((r) => r.dailyRecordId).length,
          daysWithChecks: rows.filter((r) => r.brooderChecks > 0).length,
          flaggedChecks: rows.reduce((t, r) => t + r.flaggedChecks, 0)
        }
      };
    }
  };
}

// src/services/calendar.service.ts
var CALENDAR_TYPES = ["transfer_expected", "hatch_expected", "chick_delivery", "chick_arrival", "vaccination_due", "cleaning_due", "health_follow_up"];
function createCalendarService(d) {
  const { repos } = d;
  async function events(ctx, q8) {
    assertCan(ctx, "farm.read");
    if (q8.from > q8.to) throw new AppError("VALIDATION_FAILED", "from must be on or before to");
    if (dateRange(q8.from, q8.to).length > 366) throw new AppError("VALIDATION_FAILED", "Ask for at most 366 days at a time");
    const farm = await repos.farms.findById(ctx.farmId);
    const today = localDateOf(d.clock.now(), farm.settings.timezone);
    const want = new Set(q8.types?.length ? q8.types : CALENDAR_TYPES);
    const inRange = (date) => !!date && date >= q8.from && date <= q8.to;
    const out = [];
    const push = (e, overdue = e.date < today) => {
      if (want.has(e.type) && inRange(e.date)) out.push({ ...e, id: `${e.type}:${e.refId}`, overdue });
    };
    const [batches, orders, arrivals, vaccinations, schedules, health, flocks, buyers] = await Promise.all([
      repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] } }),
      repos.orders.find(ctx.farmId, { where: { status: ["pending", "accepted", "preparing", "dispatched"] } }),
      repos.chickArrivals.find(ctx.farmId, { where: { status: "planned" } }),
      repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: q8.to } }),
      repos.cleaningTasks.find(ctx.farmId, { where: { active: true } }),
      repos.healthRecords.find(ctx.farmId, { where: { followUpDone: false }, range: { field: "followUpDate", from: q8.from, to: q8.to } }),
      repos.flocks.find(ctx.farmId),
      repos.buyers.find(ctx.farmId)
    ]);
    const code = new Map(flocks.map((f) => [f.id, f.flockCode]));
    const buyer = new Map(buyers.map((b) => [b.id, b.name]));
    for (const b of batches) {
      if (b.status === "incubating") push({ type: "transfer_expected", date: b.expectedTransferDate, title: `Move batch ${b.code} to the hatcher`, refType: "hatchery_batch", refId: b.id });
      push({ type: "hatch_expected", date: b.expectedHatchDate, title: `Batch ${b.code} hatches (${b.results?.inIncubation ?? b.eggsSet} eggs)`, refType: "hatchery_batch", refId: b.id });
    }
    for (const o of orders) {
      if (o.requestedDeliveryDate) push({ type: "chick_delivery", date: o.requestedDeliveryDate, title: `Deliver ${o.lines.reduce((t, l) => t + l.quantity, 0)} chicks to ${o.buyerId ? buyer.get(o.buyerId) ?? "buyer" : "buyer"} (order ${o.orderNumber})`, refType: "order", refId: o.id });
    }
    for (const a of arrivals) push({ type: "chick_arrival", date: a.expectedDate, title: `${a.expectedCount} chicks arrive${a.preparation ? "" : " (house not yet prepared)"}`, refType: "chick_arrival", refId: a.id, houseId: a.houseId });
    for (const v of vaccinations) {
      const overdue = v.dueDate < today;
      const date = overdue && inRange(today) ? today : v.dueDate;
      push({ type: "vaccination_due", date, title: `${v.vaccineName} for ${code.get(v.flockId) ?? "flock"}${overdue ? ` (due ${v.dueDate})` : ""}`, refType: "vaccination", refId: v.id, flockId: v.flockId }, overdue);
    }
    for (const s2 of schedules) if (s2.nextDueDate) push({ type: "cleaning_due", date: s2.nextDueDate, title: s2.title, refType: "cleaning_task", refId: s2.id, ...s2.houseIds?.length === 1 ? { houseId: s2.houseIds[0] } : {} });
    for (const h of health) push({ type: "health_follow_up", date: h.followUpDate, title: `Follow up: ${h.title}`, refType: "health_record", refId: h.id, ...h.flockId ? { flockId: h.flockId } : {} });
    return { today, events: out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.type.localeCompare(b.type)) };
  }
  function toIcs(farmName, list) {
    const esc = (s2) => s2.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const day = (s2) => s2.replace(/-/g, "");
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PoultryPilot//Farm calendar//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(`PoultryPilot \u2013 ${farmName}`)}`];
    for (const e of list) {
      lines.push("BEGIN:VEVENT", `UID:${e.id}@poultrypilot`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(e.date)}`, `DTEND;VALUE=DATE:${day(addDays(e.date, 1))}`, `SUMMARY:${esc(e.title)}`, `CATEGORIES:${e.type}`, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }
  return {
    events,
    async ics(ctx, q8) {
      const farm = await repos.farms.findById(ctx.farmId);
      return toIcs(farm?.name ?? "Farm", (await events(ctx, q8)).events);
    }
  };
}

// src/services/finance.service.ts
var PURCHASE_CATEGORY = {
  feed: "feed",
  medicine: "medicine_vaccine",
  vaccine: "medicine_vaccine",
  litter: "litter_bedding",
  equipment: "equipment",
  spare_part: "maintenance"
};
var ORDER_CATEGORY = {
  live_birds: "bird_sales",
  dressed_birds: "bird_sales",
  eggs: "egg_sales",
  hatching_eggs: "egg_sales",
  day_old_chicks: "chick_sales",
  manure: "manure_sales"
};
var COSTED_ELSEWHERE = /* @__PURE__ */ new Set(["inventory_purchase", "health_record"]);
function createFinanceService(d) {
  const { repos, clock } = d;
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
  const strip = ({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  async function farmOf(ctx, tx) {
    const f = await repos.farms.findById(ctx.farmId, tx);
    if (!f) throw notFound("Farm");
    return f;
  }
  const todayOf = (farm) => localDateOf(clock.now(), farm.settings.timezone);
  const money = (amountMinor, farm) => ({ amountMinor: Math.round(amountMinor), currency: farm.settings.currency });
  const repoOf = (t) => t === "expense" ? repos.expenses : repos.incomes;
  function assertCurrency(m, farm, field) {
    if (m && m.currency !== farm.settings.currency) throw new AppError("VALIDATION_FAILED", `${field} must be in the farm currency (${farm.settings.currency}); other currencies are not supported yet`);
  }
  async function balanceOf(ctx, account, asOf, tx) {
    const txns = await repos.transactions.find(ctx.farmId, { where: { accountId: account.id }, ...asOf ? { range: { field: "date", to: asOf } } : {} }, tx);
    const opening = !asOf || account.openingDate <= asOf ? account.openingBalance.amountMinor : 0;
    return opening + txns.reduce((t, x) => t + (x.direction === "in" ? 1 : -1) * x.amount.amountMinor, 0);
  }
  async function loadAccount(ctx, id, tx) {
    const a = await repos.moneyAccounts.findById(ctx.farmId, id, tx);
    if (!a) throw notFound("Money account");
    if (!a.active) throw new AppError("VALIDATION_FAILED", `${a.name} is closed`);
    return a;
  }
  async function assertCanPayOut(ctx, account, amountMinor, tx) {
    if (account.type === "bank" || account.type === "other") return;
    const balance = await balanceOf(ctx, account, void 0, tx);
    if (amountMinor > balance) throw new AppError("INSUFFICIENT_FUNDS", `${account.name} holds ${balance}; this payment needs ${amountMinor}`, { balanceMinor: balance });
  }
  async function postTransaction(ctx, t, tx) {
    const now = clock.now();
    const rec = { id: newId(), farmId: ctx.farmId, createdBy: ctx.userId, createdAt: now, updatedAt: now, ...defined(t) };
    await repos.transactions.insert(rec, tx);
    await d.sync.recordChange(ctx.farmId, { entity: "transaction", entityId: rec.id, op: "upsert", version: 0 }, tx);
    return rec;
  }
  async function validateRefs(ctx, farm, i, tx) {
    assertCurrency(i.amount, farm, "amount");
    if (i.date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${i.date} is in the future for this farm`);
    if (i.dueDate && i.dueDate < i.date) throw new AppError("VALIDATION_FAILED", "The due date is before the document date");
    if (i.supplierId && !await repos.suppliers.findById(ctx.farmId, i.supplierId, tx)) throw notFound("Supplier");
    if (i.buyerId && !await repos.buyers.findById(ctx.farmId, i.buyerId, tx)) throw notFound("Buyer");
    if (i.flockId && !await repos.flocks.findById(ctx.farmId, i.flockId, tx)) throw notFound("Flock");
    if (i.houseId && !await repos.houses.findById(ctx.farmId, i.houseId, tx)) throw notFound("House");
    for (const a of i.attachments ?? []) if (!await repos.mediaAssets.findById(ctx.farmId, a.assetId, tx)) throw new AppError("NOT_FOUND", `Attachment ${a.assetId} not found on this farm`);
  }
  function amounts(i, farm) {
    const t = applyTax(i.amount.amountMinor, i.tax);
    return {
      amount: money(t.grossMinor, farm),
      net: money(t.netMinor, farm),
      ...i.tax && i.tax.ratePercent > 0 ? { tax: defined({ label: i.tax.label, ratePercent: i.tax.ratePercent, inclusive: i.tax.inclusive, amountMinor: t.taxMinor }) } : {},
      amountPaid: money(0, farm),
      status: "unpaid"
    };
  }
  async function createDocument(ctx, type, i, source, tx) {
    const farm = await farmOf(ctx, tx);
    await validateRefs(ctx, farm, i, tx);
    const now = clock.now();
    const { paidNow, tax: _t, amount: _a, ...fields } = i;
    const rec = {
      id: newId(),
      farmId: ctx.farmId,
      ...defined(fields),
      ...amounts(i, farm),
      ...defined(source),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    await repoOf(type).insert(rec, tx);
    await d.audit.record(ctx, { action: `${type}.created`, entity: type, entityId: rec.id, after: { category: rec.category, amountMinor: rec.amount.amountMinor, sourceType: rec.sourceType } }, tx);
    await d.sync.recordChange(ctx.farmId, { entity: type, entityId: rec.id, op: "upsert", version: 0 }, tx);
    if (paidNow) return (await settle(ctx, type, rec.id, "payment", { date: i.date, amountMinor: rec.amount.amountMinor, accountId: paidNow.accountId, method: paidNow.method, ...paidNow.reference ? { reference: paidNow.reference } : {} }, tx)).document;
    return rec;
  }
  async function settle(ctx, type, id, kind, r, tx) {
    const farm = await farmOf(ctx, tx);
    const doc = await repoOf(type).findById(ctx.farmId, id, tx);
    if (!doc) throw notFound(type === "expense" ? "Bill" : "Income");
    if (doc.status === "cancelled") throw new AppError("INVALID_STATE_TRANSITION", "This document is cancelled");
    if (r.date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
    assertPaymentFits(kind, r.amountMinor, doc.amount.amountMinor, doc.amountPaid.amountMinor);
    const account = await loadAccount(ctx, r.accountId, tx);
    const direction = type === "expense" === (kind === "payment") ? "out" : "in";
    if (direction === "out") await assertCanPayOut(ctx, account, r.amountMinor, tx);
    const txn = await postTransaction(
      ctx,
      {
        date: r.date,
        kind,
        direction,
        accountId: account.id,
        amount: money(r.amountMinor, farm),
        category: doc.category,
        documentType: type,
        documentId: doc.id,
        ...defined({
          orderId: r.orderId,
          flockId: doc.flockId,
          houseId: doc.houseId,
          paymentMethod: r.method,
          reference: r.reference,
          supplierId: doc.supplierId,
          buyerId: doc.buyerId,
          description: r.description ?? doc.description
        })
      },
      tx
    );
    const paid = doc.amountPaid.amountMinor + (kind === "payment" ? r.amountMinor : -r.amountMinor);
    const next = await repoOf(type).update(ctx.farmId, doc.id, { amountPaid: money(paid, farm), status: paymentStatus(doc.amount.amountMinor, paid), updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: doc.version }, tx);
    if (!next) throw new AppError("VERSION_CONFLICT", "This document was changed at the same time elsewhere. Try again.");
    await d.audit.record(ctx, { action: `${type}.${kind}`, entity: type, entityId: doc.id, after: { amountMinor: r.amountMinor, accountId: account.id, status: next.status } }, tx);
    return { document: next, transaction: txn };
  }
  async function cancelDocument(ctx, type, doc, reason, tx) {
    if (doc.status === "cancelled") return doc;
    if (doc.amountPaid.amountMinor > 0) throw new AppError("INVALID_STATE_TRANSITION", `Payments of ${doc.amountPaid.amountMinor} have been recorded; refund them before cancelling`, { paidMinor: doc.amountPaid.amountMinor });
    const next = await repoOf(type).update(ctx.farmId, doc.id, { status: "cancelled", notes: [doc.notes, `Cancelled: ${reason}`].filter(Boolean).join("\n"), updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: doc.version }, tx);
    await d.audit.record(ctx, { action: `${type}.cancelled`, entity: type, entityId: doc.id, after: { reason } }, tx);
    return next;
  }
  const bySource = async (ctx, type, sourceId, tx) => {
    const rows = await repoOf(type).find(ctx.farmId, { where: { sourceId } }, tx);
    return rows.find((x) => x.status !== "cancelled") ?? null;
  };
  function nextDate(freq, date) {
    switch (freq) {
      case "daily":
        return addDays(date, 1);
      case "weekly":
        return addDays(date, 7);
      case "monthly":
        return addMonthsClamped(date, 1);
      case "quarterly":
        return addMonthsClamped(date, 3);
      default:
        return addMonthsClamped(date, 12);
    }
  }
  const paused = (r, date) => r.pauses.some((p6) => date >= p6.from && (!p6.to || date <= p6.to));
  async function generateDue(ctx, tx) {
    const run = async (t) => {
      const farm = await farmOf(ctx, t);
      const today = todayOf(farm);
      let created = 0;
      for (const r of await repos.recurringExpenses.find(ctx.farmId, { where: { active: true }, range: { field: "nextDueDate", to: today } }, t)) {
        let due = r.nextDueDate;
        for (let i = 0; i < 400 && due <= today && (!r.endDate || due <= r.endDate); i++) {
          const exists = (await repos.expenses.find(ctx.farmId, { where: { recurringExpenseId: r.id, dueDate: due }, limit: 1 }, t))[0];
          if (!exists && !paused(r, due)) {
            await createDocument(ctx, "expense", { kind: "expense", date: due, dueDate: due, category: r.category, description: r.name, amount: r.amount, ...defined({ tax: r.tax, supplierId: r.supplierId, vendor: r.vendor, flockId: r.flockId, houseId: r.houseId }) }, { sourceType: "recurring_expense", recurringExpenseId: r.id }, t);
            created++;
          }
          due = nextDate(r.frequency, due);
        }
        const ended = !!r.endDate && due > r.endDate;
        await repos.recurringExpenses.update(ctx.farmId, r.id, { nextDueDate: ended ? void 0 : due, active: !ended, updatedAt: clock.now() }, void 0, t);
      }
      return { created };
    };
    return tx ? run(tx) : repos.tx.run(run);
  }
  const docView = (doc, today) => ({ ...strip(doc), outstandingMinor: doc.status === "cancelled" ? 0 : doc.amount.amountMinor - doc.amountPaid.amountMinor, ...doc.status !== "paid" && doc.status !== "cancelled" ? ageBucket(doc.dueDate ?? doc.date, today) : {} });
  async function documentsIn(ctx, type, from, to) {
    return (await repoOf(type).find(ctx.farmId, { range: { field: "date", ...from ? { from } : {}, ...to ? { to } : {} } })).filter((x) => x.status !== "cancelled");
  }
  function group(rows, key, value) {
    const m = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const k = key(r) ?? "unassigned";
      m.set(k, (m.get(k) ?? 0) + value(r));
    }
    return [...m.entries()].map(([k, v]) => ({ key: k, amountMinor: v })).sort((a, b) => b.amountMinor - a.amountMinor);
  }
  return {
    settle,
    // ---- suppliers and accounts
    async createSupplier(ctx, r) {
      assertCan(ctx, "money.record");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(r), createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.suppliers.insert(rec);
      return strip(rec);
    },
    async listSuppliers(ctx) {
      assertCan(ctx, "money.read");
      return (await repos.suppliers.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] })).map(strip);
    },
    /** A supplier with what the farm still owes it. */
    async supplierStatement(ctx, id) {
      assertCan(ctx, "money.read");
      const s2 = await repos.suppliers.findById(ctx.farmId, id);
      if (!s2) throw notFound("Supplier");
      const farm = await farmOf(ctx);
      const bills = (await repos.expenses.find(ctx.farmId, { where: { supplierId: id }, sort: [{ field: "date", dir: -1 }] })).filter((b) => b.status !== "cancelled");
      return { supplier: strip(s2), bills: bills.map((b) => docView(b, todayOf(farm))), outstandingMinor: bills.reduce((t, b) => t + b.amount.amountMinor - b.amountPaid.amountMinor, 0), totalBilledMinor: bills.reduce((t, b) => t + b.amount.amountMinor, 0) };
    },
    async createAccount(ctx, r) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      assertCurrency(r.openingBalance, farm, "openingBalance");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(r), active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.moneyAccounts.insert(rec).catch(duplicate(`An account named "${r.name}"`));
      await repos.tx.run((tx) => d.audit.record(ctx, { action: "account.created", entity: "money_account", entityId: rec.id, after: { name: rec.name, openingMinor: rec.openingBalance.amountMinor } }, tx));
      return { ...strip(rec), balanceMinor: rec.openingBalance.amountMinor };
    },
    async listAccounts(ctx) {
      assertCan(ctx, "money.read");
      const rows = await repos.moneyAccounts.find(ctx.farmId, { sort: [{ field: "name", dir: 1 }] });
      return Promise.all(rows.map(async (a) => ({ ...strip(a), balanceMinor: await balanceOf(ctx, a) })));
    },
    /** Money moved between two of the farm's accounts: two ledger entries, no effect on profit. */
    async transfer(ctx, r) {
      assertCan(ctx, "money.record");
      if (r.fromAccountId === r.toAccountId) throw new AppError("VALIDATION_FAILED", "Choose two different accounts");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertCurrency(r.amount, farm, "amount");
        if (r.date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${r.date} is in the future for this farm`);
        if (!(r.amount.amountMinor > 0)) throw new AppError("VALIDATION_FAILED", "Amount must be more than zero");
        const from = await loadAccount(ctx, r.fromAccountId, tx);
        const to = await loadAccount(ctx, r.toAccountId, tx);
        await assertCanPayOut(ctx, from, r.amount.amountMinor, tx);
        const group2 = newId();
        const common = { date: r.date, kind: "transfer", amount: r.amount, transferGroupId: group2, ...defined({ reference: r.reference, description: r.description ?? `Transfer ${from.name} \u2192 ${to.name}` }) };
        const out = await postTransaction(ctx, { ...common, direction: "out", accountId: from.id, counterpartAccountId: to.id }, tx);
        const inn = await postTransaction(ctx, { ...common, direction: "in", accountId: to.id, counterpartAccountId: from.id }, tx);
        await d.audit.record(ctx, { action: "money.transferred", entity: "money_account", entityId: from.id, after: { to: to.id, amountMinor: r.amount.amountMinor } }, tx);
        return { transferGroupId: group2, out: strip(out), in: strip(inn) };
      });
    },
    async ledger(ctx, q8) {
      assertCan(ctx, "money.read");
      const rows = await repos.transactions.find(ctx.farmId, { ...q8.accountId ? { where: { accountId: q8.accountId } } : {}, range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} }, sort: [{ field: "date", dir: -1 }, { field: "createdAt", dir: -1 }], limit: q8.limit });
      return rows.map(({ farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, ...t }) => ({ ...t, createdAt: createdAt.toISOString() }));
    },
    // ---- documents
    async createExpense(ctx, i) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      if (!i.allowDuplicate) {
        const near = (await repos.expenses.find(ctx.farmId, { range: { field: "date", from: addDays(i.date, -3), to: addDays(i.date, 3) } })).find(
          (e) => e.status !== "cancelled" && e.amount.amountMinor === i.amount.amountMinor && e.amount.currency === i.amount.currency && // Equal amounts are often genuinely separate (weekly wages, two deliveries). Ask only when the other bill
          // was created automatically (stock purchase, vet visit, recurring cost), or a hand-entered bill matches
          // on amount, category, vendor and date.
          (e.sourceType !== "manual" || e.category === i.category && (e.vendor ?? "") === (i.vendor ?? "") && e.date === i.date)
        );
        if (near) {
          const auto = near.sourceType === "inventory_purchase" ? " (created automatically from a stock purchase)" : near.sourceType === "health_record" ? " (created automatically from a health record)" : "";
          throw new AppError("POSSIBLE_DUPLICATE", `A bill for the same amount on ${near.date} already exists: "${near.description}"${auto}. Save anyway only if this is a different bill.`, { existingId: near.id, date: near.date, description: near.description, sourceType: near.sourceType });
        }
      }
      const { allowDuplicate: _a, ...doc } = i;
      i = doc;
      return docView(await repos.tx.run((tx) => createDocument(ctx, "expense", i, { sourceType: "manual" }, tx)), todayOf(farm));
    },
    async createIncome(ctx, i) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      return docView(await repos.tx.run((tx) => createDocument(ctx, "income", i, { sourceType: "manual" }, tx)), todayOf(farm));
    },
    async listDocuments(ctx, type, q8) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const where = {};
      if (q8.status) where["status"] = q8.status;
      if (q8.flockId) where["flockId"] = q8.flockId;
      if (q8.houseId) where["houseId"] = q8.houseId;
      const rows = await repoOf(type).find(ctx.farmId, { where, range: { field: "date", ...q8.from ? { from: q8.from } : {}, ...q8.to ? { to: q8.to } : {} }, sort: [{ field: "date", dir: -1 }], limit: q8.limit });
      return rows.map((x) => docView(x, todayOf(farm)));
    },
    async getDocument(ctx, type, id) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const doc = await repoOf(type).findById(ctx.farmId, id);
      if (!doc) throw notFound(type === "expense" ? "Bill" : "Income");
      const payments = await repos.transactions.find(ctx.farmId, { where: { documentId: id }, sort: [{ field: "date", dir: 1 }] });
      return { ...docView(doc, todayOf(farm)), payments: payments.map(({ farmId: _f, updatedAt: _u, updatedBy: _ub, createdAt, ...t }) => ({ ...t, createdAt: createdAt.toISOString() })) };
    },
    async pay(ctx, type, id, r) {
      assertCan(ctx, "payment.record");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertCurrency(r.amount, farm, "amount");
        const doc = await repoOf(type).findById(ctx.farmId, id, tx);
        if (doc?.sourceType === "market_order" || doc?.sourceType === "chick_order") throw new AppError("VALIDATION_FAILED", "Record payments for orders on the order, so the order's payment status stays right");
        const out = await settle(ctx, type, id, "payment", { date: r.date, amountMinor: r.amount.amountMinor, accountId: r.accountId, ...defined({ method: r.method, reference: r.reference }) }, tx);
        return { document: docView(out.document, todayOf(farm)), transaction: strip(out.transaction) };
      });
    },
    async refund(ctx, type, id, r) {
      assertCan(ctx, "money.record");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        assertCurrency(r.amount, farm, "amount");
        const doc = await repoOf(type).findById(ctx.farmId, id, tx);
        if (doc?.sourceType === "market_order" || doc?.sourceType === "chick_order") throw new AppError("VALIDATION_FAILED", "Record refunds for orders on the order");
        const out = await settle(ctx, type, id, "refund", { date: r.date, amountMinor: r.amount.amountMinor, accountId: r.accountId, description: r.reason, ...defined({ method: r.method }) }, tx);
        return { document: docView(out.document, todayOf(farm)), transaction: strip(out.transaction) };
      });
    },
    /** Only unpaid, hand-entered documents are cancelled here; automatic ones follow their source. */
    async cancel(ctx, type, id, reason) {
      assertCan(ctx, "money.delete");
      return repos.tx.run(async (tx) => {
        const farm = await farmOf(ctx, tx);
        const doc = await repoOf(type).findById(ctx.farmId, id, tx);
        if (!doc) throw notFound(type === "expense" ? "Bill" : "Income");
        if (doc.sourceType !== "manual" && doc.sourceType !== "recurring_expense") throw new AppError("INVALID_STATE_TRANSITION", `This document was created from a ${doc.sourceType.replace("_", " ")}; change it there`);
        return docView(await cancelDocument(ctx, type, doc, reason, tx), todayOf(farm));
      });
    },
    // ---- recurring expenses
    async createRecurring(ctx, r) {
      assertCan(ctx, "money.record");
      const farm = await farmOf(ctx);
      assertCurrency(r.amount, farm, "amount");
      if (r.supplierId && !await repos.suppliers.findById(ctx.farmId, r.supplierId)) throw notFound("Supplier");
      if (r.endDate && r.endDate < r.startDate) throw new AppError("VALIDATION_FAILED", "End date is before the start date");
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(r), pauses: r.pauses ?? [], nextDueDate: r.startDate, active: true, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.recurringExpenses.insert(rec);
      return strip(rec);
    },
    async listRecurring(ctx) {
      assertCan(ctx, "money.read");
      return (await repos.recurringExpenses.find(ctx.farmId, { sort: [{ field: "nextDueDate", dir: 1 }] })).map(strip);
    },
    async pauseRecurring(ctx, id, r) {
      assertCan(ctx, "money.record");
      const rec = await repos.recurringExpenses.findById(ctx.farmId, id);
      if (!rec) throw notFound("Recurring expense");
      if (r.to && r.to < r.from) throw new AppError("VALIDATION_FAILED", "Pause ends before it starts");
      return strip(await repos.recurringExpenses.update(ctx.farmId, id, { pauses: [...rec.pauses, defined(r)], updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: rec.version }));
    },
    generateDue: (ctx) => {
      assertCan(ctx, "money.record");
      return generateDue(ctx);
    },
    // ---- reports
    /** Profit and loss for a period, accrual basis (by document date), amounts excluding tax. */
    async profitAndLoss(ctx, q8) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const scope = (rows) => rows.filter((x) => (!q8.flockId || x.flockId === q8.flockId) && (!q8.houseId || x.houseId === q8.houseId));
      const incomes = scope(await documentsIn(ctx, "income", q8.from, q8.to));
      const expenses = scope(await documentsIn(ctx, "expense", q8.from, q8.to));
      const revenue = group(incomes, (x) => x.category, (x) => x.net.amountMinor);
      const costs = group(expenses, (x) => x.category, (x) => x.net.amountMinor);
      const totalRevenue = revenue.reduce((t, x) => t + x.amountMinor, 0);
      const totalExpenses = costs.reduce((t, x) => t + x.amountMinor, 0);
      const monthly = /* @__PURE__ */ new Map();
      for (const x of incomes) {
        const m = monthly.get(x.date.slice(0, 7)) ?? { revenueMinor: 0, expensesMinor: 0 };
        m.revenueMinor += x.net.amountMinor;
        monthly.set(x.date.slice(0, 7), m);
      }
      for (const x of expenses) {
        const m = monthly.get(x.date.slice(0, 7)) ?? { revenueMinor: 0, expensesMinor: 0 };
        m.expensesMinor += x.net.amountMinor;
        monthly.set(x.date.slice(0, 7), m);
      }
      return {
        from: q8.from,
        to: q8.to,
        currency: farm.settings.currency,
        basis: "accrual",
        revenue: { byCategory: revenue, totalMinor: totalRevenue },
        expenses: { byCategory: costs, totalMinor: totalExpenses },
        netProfitMinor: totalRevenue - totalExpenses,
        marginPercent: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue * 100 : null,
        tax: { onSalesMinor: incomes.reduce((t, x) => t + (x.tax?.amountMinor ?? 0), 0), onPurchasesMinor: expenses.reduce((t, x) => t + (x.tax?.amountMinor ?? 0), 0) },
        byMonth: [...monthly.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([month, v]) => ({ month, ...v, profitMinor: v.revenueMinor - v.expensesMinor }))
      };
    },
    /** Cash in and out of every account for a period, with opening and closing balances. Transfers are shown but not counted. */
    async cashFlow(ctx, q8) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const accounts = await repos.moneyAccounts.find(ctx.farmId);
      const txns = await repos.transactions.find(ctx.farmId, { range: { field: "date", from: q8.from, to: q8.to } });
      const real = txns.filter((t) => t.kind !== "transfer");
      const sum2 = (rows) => rows.reduce((t, x) => t + x.amount.amountMinor, 0);
      const inflows = real.filter((t) => t.direction === "in");
      const outflows = real.filter((t) => t.direction === "out");
      const accountRows = await Promise.all(
        accounts.map(async (a) => {
          const openingMinor = await balanceOf(ctx, a, addDays(q8.from, -1));
          const openedInPeriodMinor = a.openingDate >= q8.from && a.openingDate <= q8.to ? a.openingBalance.amountMinor : 0;
          const mine = txns.filter((t) => t.accountId === a.id);
          const inMinor = sum2(mine.filter((t) => t.direction === "in"));
          const outMinor = sum2(mine.filter((t) => t.direction === "out"));
          return { accountId: a.id, name: a.name, type: a.type, openingMinor, openedInPeriodMinor, inMinor, outMinor, closingMinor: openingMinor + openedInPeriodMinor + inMinor - outMinor };
        })
      );
      return {
        from: q8.from,
        to: q8.to,
        currency: farm.settings.currency,
        basis: "cash",
        inflows: { byCategory: group(inflows, (t) => t.category ?? t.kind, (t) => t.amount.amountMinor), totalMinor: sum2(inflows) },
        outflows: { byCategory: group(outflows, (t) => t.category ?? t.kind, (t) => t.amount.amountMinor), totalMinor: sum2(outflows) },
        netCashFlowMinor: sum2(inflows) - sum2(outflows),
        transfersMinor: sum2(txns.filter((t) => t.kind === "transfer" && t.direction === "out")),
        accounts: accountRows
      };
    },
    async expenseBreakdown(ctx, q8) {
      assertCan(ctx, "money.read");
      const rows = await documentsIn(ctx, "expense", q8.from, q8.to);
      const suppliers = new Map((await repos.suppliers.find(ctx.farmId)).map((s2) => [s2.id, s2.name]));
      const flocks = new Map((await repos.flocks.find(ctx.farmId)).map((f) => [f.id, f.flockCode]));
      const houses = new Map((await repos.houses.find(ctx.farmId)).map((h) => [h.id, h.name]));
      const net = (x) => x.net.amountMinor;
      return {
        from: q8.from,
        to: q8.to,
        totalMinor: rows.reduce((t, x) => t + net(x), 0),
        byCategory: group(rows, (x) => x.category, net),
        byKind: group(rows, (x) => x.kind, net),
        bySupplier: group(rows, (x) => x.supplierId ? suppliers.get(x.supplierId) : x.vendor, net),
        byFlock: group(rows, (x) => x.flockId ? flocks.get(x.flockId) : void 0, net),
        byHouse: group(rows, (x) => x.houseId ? houses.get(x.houseId) : void 0, net)
      };
    },
    async revenueBreakdown(ctx, q8) {
      assertCan(ctx, "money.read");
      const rows = await documentsIn(ctx, "income", q8.from, q8.to);
      const buyers = new Map((await repos.buyers.find(ctx.farmId)).map((b) => [b.id, b.name]));
      const flocks = new Map((await repos.flocks.find(ctx.farmId)).map((f) => [f.id, f.flockCode]));
      const net = (x) => x.net.amountMinor;
      return {
        from: q8.from,
        to: q8.to,
        totalMinor: rows.reduce((t, x) => t + net(x), 0),
        byCategory: group(rows, (x) => x.category, net),
        byCustomer: group(rows, (x) => x.buyerId ? buyers.get(x.buyerId) : x.customerName, net),
        byFlock: group(rows, (x) => x.flockId ? flocks.get(x.flockId) : void 0, net),
        bySource: group(rows, (x) => x.sourceType, net)
      };
    },
    /** Receivables (owed to the farm) or payables (owed by it), aged by days past due. */
    async openItems(ctx, type) {
      assertCan(ctx, "money.read");
      const farm = await farmOf(ctx);
      const today = todayOf(farm);
      const rows = (await repoOf(type).find(ctx.farmId, { where: { status: ["unpaid", "partially_paid"] }, sort: [{ field: "dueDate", dir: 1 }] })).map((x) => docView(x, today));
      const buckets = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0 };
      for (const r of rows) buckets[r.bucket] = (buckets[r.bucket] ?? 0) + r.outstandingMinor;
      return { date: today, totalOutstandingMinor: rows.reduce((t, r) => t + r.outstandingMinor, 0), buckets, items: rows };
    },
    /**
     * Flock profitability: revenue and every cost of each flock (chicks, feed eaten and wasted, medicine and vet fees,
     * bills allocated to the flock), profit, margin, cost per bird, per kg produced and per egg. Farm totals across them.
     */
    async flockProfitability(ctx, q8) {
      assertCan(ctx, "money.read");
      const flocks = q8.flockId ? [await d.flocks.ledger.loadFlock(ctx, q8.flockId)] : await repos.flocks.find(ctx.farmId, { where: { status: q8.status ? q8.status : ["active", "closed"] } });
      const rows = [];
      for (const f of flocks) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        rows.push({
          flockId: f.id,
          flockCode: f.flockCode,
          type: f.type,
          status: f.status,
          houseId: f.houseId,
          birdsIn: m.birdsIn,
          currentBirdCount: m.currentBirdCount,
          eggsCollected: m.eggsCollected,
          weightProducedKg: m.weightProducedKg,
          revenueMinor: m.revenueMinor,
          cost: m.cost,
          profitMinor: m.profitMinor,
          marginPercent: m.marginPercent,
          costPerBirdMinor: m.costPerBirdMinor,
          costPerKgProducedMinor: m.costPerKgProducedMinor,
          costPerEggMinor: m.eggsCollected > 0 ? m.cost.totalMinor / m.eggsCollected : null,
          costsComplete: m.costsComplete
        });
      }
      const sum2 = (f) => rows.reduce((t, r) => t + f(r), 0);
      const cost = sum2((r) => r.cost.totalMinor);
      const birds = sum2((r) => r.birdsIn);
      const layerRows = rows.filter((r) => r.eggsCollected > 0);
      const eggs = layerRows.reduce((t, r) => t + r.eggsCollected, 0);
      const kg = rows.reduce((t, r) => t + (r.weightProducedKg ?? 0), 0);
      const meatRows = rows.filter((r) => (r.weightProducedKg ?? 0) > 0);
      return {
        flocks: rows,
        totals: {
          revenueMinor: sum2((r) => r.revenueMinor),
          costMinor: cost,
          profitMinor: sum2((r) => r.profitMinor),
          costPerBirdMinor: birds > 0 ? Math.round(cost / birds) : null,
          costPerEggMinor: eggs > 0 ? layerRows.reduce((t, r) => t + r.cost.totalMinor, 0) / eggs : null,
          costPerKgMinor: kg > 0 ? Math.round(meatRows.reduce((t, r) => t + r.cost.totalMinor, 0) / kg) : null
        }
      };
    },
    /** House-level costing: bills and incomes allocated to the house itself, plus its flocks' costs and revenue. */
    async houseCosting(ctx, q8) {
      assertCan(ctx, "money.read");
      const [houses, flocks, expenses, incomes] = await Promise.all([repos.houses.find(ctx.farmId), repos.flocks.find(ctx.farmId, { where: { status: ["active", "closed"] } }), documentsIn(ctx, "expense", q8.from, q8.to), documentsIn(ctx, "income", q8.from, q8.to)]);
      const out = [];
      for (const h of houses) {
        const direct = expenses.filter((x) => x.houseId === h.id && !x.flockId).reduce((t, x) => t + x.net.amountMinor, 0);
        const directIncome = incomes.filter((x) => x.houseId === h.id && !x.flockId).reduce((t, x) => t + x.net.amountMinor, 0);
        let flockCost = 0;
        let flockRevenue = 0;
        for (const f of flocks.filter((x) => x.houseId === h.id)) {
          const m = await d.flocks.metrics(ctx, f.id, {});
          flockCost += m.cost.totalMinor;
          flockRevenue += m.revenueMinor;
        }
        out.push({ houseId: h.id, name: h.name, directCostMinor: direct, flockCostMinor: flockCost, totalCostMinor: direct + flockCost, revenueMinor: directIncome + flockRevenue, profitMinor: directIncome + flockRevenue - direct - flockCost });
      }
      return { houses: out };
    },
    // ---- postings from other modules (inside their transactions) -------------------------------
    /** FeedWise: a purchase lot becomes an unpaid purchase bill. */
    async onInventoryPurchase(ctx, item, lot, supplierId, tx) {
      await createDocument(ctx, "expense", {
        kind: "purchase",
        date: lot.receivedDate,
        category: PURCHASE_CATEGORY[item.category] ?? "stock_purchase",
        description: `${item.name}: ${lot.quantityReceived} ${item.unit}${lot.batchNumber ? ` (batch ${lot.batchNumber})` : ""}`,
        amount: { amountMinor: Math.round(lot.quantityReceived * lot.unitCost.amountMinor), currency: lot.unitCost.currency },
        ...defined({ supplierId, vendor: lot.supplier, invoiceNumber: lot.invoiceNumber })
      }, { sourceType: "inventory_purchase", sourceId: lot.id }, tx);
    },
    /** FlockHealth: a fee on a health record becomes a vet services bill; removing the record cancels it if unpaid. */
    async onHealthCost(ctx, rec, recordId, tx) {
      const existing = await bySource(ctx, "expense", recordId, tx);
      if (!rec || !rec.cost) {
        if (existing) await cancelDocument(ctx, "expense", existing, "Health record changed", tx);
        return;
      }
      if (existing && existing.status !== "cancelled") {
        if (existing.amount.amountMinor === rec.cost.amountMinor) return;
        await cancelDocument(ctx, "expense", existing, "Health record cost changed", tx);
      }
      await createDocument(ctx, "expense", { kind: "expense", date: rec.date, category: "vet_services", description: `Health: ${rec.title}`, amount: rec.cost, ...defined({ vendor: rec.vetName, flockId: rec.flockId, houseId: rec.houseId }) }, { sourceType: "health_record", sourceId: recordId }, tx);
    },
    /** Flock engine: a bird sale becomes a receivable, unless an order already carries the income. */
    async onFlockSale(ctx, flock, event, tx) {
      if (event.orderId || !event.total || event.total.amountMinor <= 0) return;
      await createDocument(ctx, "income", { kind: "sale", date: event.date, dueDate: event.date, category: "bird_sales", description: `${event.birds} birds from ${flock.flockCode}${event.totalLiveWeightKg ? `, ${event.totalLiveWeightKg} kg` : ""}`, amount: event.total, flockId: flock.id, houseId: flock.houseId }, { sourceType: "flock_sale", sourceId: event.id }, tx);
    },
    /** Flock engine: reversing a sale cancels its receivable; once paid, the payment must be refunded first. */
    async onFlockSaleReversed(ctx, saleEventId, tx) {
      const doc = await bySource(ctx, "income", saleEventId, tx);
      if (doc) await cancelDocument(ctx, "income", doc, "Sale reversed", tx);
    },
    /** Orders: acceptance creates the receivable; cancellation cancels it (refund payments first). */
    async onOrderAccepted(ctx, order, tx) {
      const line = order.lines[0];
      return createDocument(ctx, "income", {
        kind: "sale",
        date: localDateOf(clock.now(), (await farmOf(ctx, tx)).settings.timezone),
        category: ORDER_CATEGORY[line.category] ?? "other_income",
        description: `Order ${order.orderNumber}: ${line.quantity} ${line.unit} ${line.description}`.slice(0, 300),
        amount: order.total,
        ...defined({ dueDate: order.requestedDeliveryDate, buyerId: order.buyerId, customerName: order.buyerName })
      }, { sourceType: order.listingId ? "market_order" : "chick_order", sourceId: order.id }, tx);
    },
    async onOrderCancelled(ctx, order, tx) {
      const doc = order.incomeId ? await repos.incomes.findById(ctx.farmId, order.incomeId, tx) : null;
      if (doc) await cancelDocument(ctx, "income", doc, `Order ${order.orderNumber} cancelled`, tx);
    },
    /** Flock engine hooks: bills and other income allocated to a flock that reach it no other way. */
    async flockExtraCostMinor(ctx, flockId, asOf) {
      const rows = await repos.expenses.find(ctx.farmId, { where: { flockId }, range: { field: "date", to: asOf } });
      return rows.filter((x) => x.status !== "cancelled" && !COSTED_ELSEWHERE.has(x.sourceType)).reduce((t, x) => t + x.net.amountMinor, 0);
    },
    async flockExtraIncomeMinor(ctx, flockId, asOf) {
      const rows = await repos.incomes.find(ctx.farmId, { where: { flockId }, range: { field: "date", to: asOf } });
      return rows.filter((x) => x.status !== "cancelled" && x.sourceType === "manual").reduce((t, x) => t + x.net.amountMinor, 0);
    },
    /** Hourly job. */
    async runScheduled(ctx, tx) {
      await generateDue(ctx, tx);
    }
  };
}

// src/services/market.service.ts
var EGG_UNITS = { egg: 1, eggs: 1, dozen: 12, tray: 30 };
function createMarketService(d) {
  const { repos, clock } = d;
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
  const strip = ({ farmId: _f, deletedAt: _d, deletedBy: _db, createdAt, updatedAt, ...r }) => ({
    ...r,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  });
  async function farmOf(farmId, tx) {
    const f = await repos.farms.findById(farmId, tx);
    if (!f) throw notFound("Farm");
    return f;
  }
  const todayOf = (farm) => localDateOf(clock.now(), farm.settings.timezone);
  async function validateListing(ctx, farm, i, tx) {
    if (i.price.currency !== farm.settings.currency) throw new AppError("VALIDATION_FAILED", `Price must be in the farm currency (${farm.settings.currency})`);
    if (!(i.price.amountMinor > 0)) throw new AppError("VALIDATION_FAILED", "Price must be more than zero");
    for (const p6 of i.photos ?? []) if (!await repos.mediaAssets.findById(ctx.farmId, p6, tx)) throw new AppError("NOT_FOUND", `Photo ${p6} not found on this farm`);
    const s2 = i.source;
    if (!s2) return;
    if (s2.kind === "eggs") {
      if (i.category !== "eggs" && i.category !== "hatching_eggs") throw new AppError("VALIDATION_FAILED", "An egg stock source needs an egg listing");
      if (!EGG_UNITS[i.unit.toLowerCase()]) throw new AppError("VALIDATION_FAILED", `Egg listings are sold per ${Object.keys(EGG_UNITS).join(", ")}`);
    }
    if (s2.kind === "chick_lot") {
      if (!s2.chickLotId || !await repos.chickLots.findById(ctx.farmId, s2.chickLotId, tx)) throw notFound("Chick lot");
      if (i.category !== "day_old_chicks") throw new AppError("VALIDATION_FAILED", "A chick lot source needs a day-old chicks listing");
    }
    if (s2.kind === "flock") {
      const f = s2.flockId ? await repos.flocks.findById(ctx.farmId, s2.flockId, tx) : null;
      if (!f) throw notFound("Flock");
      if (i.category !== "live_birds") throw new AppError("VALIDATION_FAILED", "A flock source needs a live birds listing");
    }
  }
  const listingView = (l) => strip(l);
  async function publicListing(l) {
    const farm = await repos.farms.findById(l.farmId);
    const { source: _s, ...rest } = strip(l);
    return { ...rest, seller: { farmId: l.farmId, name: farm?.name ?? "", locationLabel: farm?.locationLabel ?? null, countryCode: farm?.countryCode ?? null } };
  }
  function orderView(o, viewer, sellerContact2) {
    const base = strip(o);
    const shareContact = viewer === "seller" || !["pending", "cancelled"].includes(o.status);
    return {
      ...base,
      quantity: o.lines.reduce((t, l) => t + l.quantity, 0),
      outstandingMinor: o.total.amountMinor - (o.amountPaid?.amountMinor ?? 0),
      ...viewer === "buyer" ? { sellerContact: shareContact ? sellerContact2 ?? null : null } : {},
      /** Moves the state machine allows from here (for the apps' buttons). */
      nextStatuses: ORDER_TRANSITIONS[o.status].filter((s2) => !(o.fulfilment === "pickup" && s2 === "dispatched") && !(o.fulfilment !== "pickup" && s2 === "delivered" && o.status !== "dispatched"))
    };
  }
  async function sellerContact(farmId) {
    const owners = (await repos.memberships.findByFarm(farmId)).filter((m) => m.role === "owner" && m.status === "active");
    const user = owners[0]?.userId ? await repos.users.findById(owners[0].userId) : null;
    return user ? defined({ name: user.fullName, email: user.email, phone: user.phone }) : null;
  }
  async function drawStock(ctx, o, listing, date, tx) {
    const line = o.lines[0];
    const lotId = line.chickLotId ?? (listing?.source?.kind === "chick_lot" ? listing.source.chickLotId : void 0) ?? (o.hatcheryBatchId ? (await repos.hatcheryBatches.findById(ctx.farmId, o.hatcheryBatchId, tx))?.chickLotId : void 0);
    if (lotId || o.hatcheryBatchId) {
      if (!lotId) throw new AppError("VALIDATION_FAILED", "The batch for this order has not been graded yet; there are no chicks to deliver");
      const lot = await repos.chickLots.findById(ctx.farmId, lotId, tx);
      if (!lot) throw notFound("Chick lot");
      const a = await d.hatchery.lotAvailability(ctx, lot, o.id, tx);
      if (line.quantity > a.available) throw new AppError("INSUFFICIENT_STOCK", `Only ${Math.max(0, a.available)} chicks are free in the lot (${lot.remaining} remaining, ${a.reserved} booked by other orders)`, a);
      const remaining = lot.remaining - line.quantity;
      const next = await repos.chickLots.update(ctx.farmId, lot.id, { remaining, status: remaining === 0 ? "depleted" : "available", updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: lot.version }, tx);
      if (!next) throw new AppError("VERSION_CONFLICT", "That chick lot changed at the same time elsewhere. Try again.");
      return { lines: [{ ...line, chickLotId: lot.id }] };
    }
    if (listing?.source?.kind === "eggs") {
      const eggs = Math.round(line.quantity * EGG_UNITS[listing.unit.toLowerCase()]);
      const stock = await d.inventory.eggStock(ctx, tx);
      const bucket = listing.source.eggGrade ?? "ungraded";
      const available = stock.byGrade[bucket] ?? 0;
      if (eggs > available) throw new AppError("INSUFFICIENT_STOCK", `Only ${available} ${bucket} eggs in stock for this order of ${eggs}`, { available, requested: eggs });
      const now = clock.now();
      await repos.eggInventory.insert({ id: newId(), farmId: ctx.farmId, date, type: "sold", ...listing.source.eggGrade ? { grade: listing.source.eggGrade } : {}, quantityDelta: -eggs, sourceType: "order", sourceId: o.id, note: `Order ${o.orderNumber}`, createdBy: ctx.userId, createdAt: now, updatedAt: now }, tx);
    }
    if (listing?.source?.kind === "flock") {
      await d.flocks.sell(ctx, listing.source.flockId, { date, birds: Math.round(line.quantity), total: line.total, notes: `Order ${o.orderNumber}` }, { orderId: o.id });
    }
    return {};
  }
  async function transition(ctx, actor, id, to, extra = {}) {
    return repos.tx.run(async (tx) => {
      const farm = await farmOf(ctx.farmId, tx);
      const o = await repos.orders.findById(ctx.farmId, id, tx);
      if (!o) throw notFound("Order");
      assertOrderTransition(o, to, actor);
      const listing = o.listingId ? await repos.listings.findById(ctx.farmId, o.listingId, tx) : null;
      const line = o.lines[0];
      let patch = {};
      if (to === "accepted") {
        if (listing) {
          if (listing.status !== "active" && listing.status !== "sold_out") throw new AppError("INVALID_STATE_TRANSITION", `The listing is ${listing.status}`);
          if (line.quantity > listing.quantityAvailable) throw new AppError("INSUFFICIENT_STOCK", `Only ${listing.quantityAvailable} ${listing.unit} left on the listing`, { available: listing.quantityAvailable });
          const left = q3(listing.quantityAvailable - line.quantity);
          const ok = await repos.listings.update(ctx.farmId, listing.id, { quantityAvailable: left, status: left <= 0 ? "sold_out" : listing.status, updatedAt: clock.now() }, { expectedVersion: listing.version }, tx);
          if (!ok) throw new AppError("VERSION_CONFLICT", "The listing changed at the same time elsewhere. Try again.");
        }
        const income = await d.finance.onOrderAccepted(ctx, o, tx);
        patch = { incomeId: income.id };
      }
      if (to === "cancelled") {
        if ((o.amountPaid?.amountMinor ?? 0) > 0) throw new AppError("INVALID_STATE_TRANSITION", `Payments of ${o.amountPaid.amountMinor} are recorded on this order; refund them before cancelling`);
        if (listing && RESERVING_STATUSES.includes(o.status)) {
          const back = q3(listing.quantityAvailable + line.quantity);
          await repos.listings.update(ctx.farmId, listing.id, { quantityAvailable: back, status: listing.status === "sold_out" ? "active" : listing.status, updatedAt: clock.now() }, { expectedVersion: listing.version }, tx);
        }
        await d.finance.onOrderCancelled(ctx, o, tx);
        patch = { cancelReason: extra.reason ?? "", cancelledBy: actor };
      }
      if (to === "dispatched") patch = { delivery: defined({ ...o.delivery, ...extra.delivery, dispatchedAt: clock.now() }) };
      if (to === "delivered") {
        const date = extra.date ?? todayOf(farm);
        if (date > todayOf(farm)) throw new AppError("VALIDATION_FAILED", `${date} is in the future for this farm`);
        if (extra.delivery?.proofAssetId && !await repos.mediaAssets.findById(ctx.farmId, extra.delivery.proofAssetId, tx)) throw new AppError("NOT_FOUND", "Proof of delivery image not found");
        patch = { ...await drawStock(ctx, o, listing, date, tx), deliveredDate: date, delivery: defined({ ...o.delivery, ...extra.delivery, deliveredAt: clock.now() }) };
      }
      const now = clock.now();
      const fresh = await repos.orders.findById(ctx.farmId, id, tx);
      const next = await repos.orders.update(ctx.farmId, id, { ...patch, status: to, statusHistory: [...fresh.statusHistory, { status: to, at: now, by: ctx.userId }], updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: fresh.version }, tx);
      if (!next) throw new AppError("VERSION_CONFLICT", "This order was changed at the same time. Reload and try again.");
      await d.audit.record(ctx, { action: `order.${to}`, entity: "order", entityId: id, before: { status: o.status }, after: { status: to, by: actor, ...extra.reason ? { reason: extra.reason } : {} } }, tx);
      await d.notifications?.onOrderEvent(ctx, next, { kind: "status", to, actor }, tx);
      await d.sync.recordChange(ctx.farmId, { entity: "order", entityId: id, op: "upsert", version: next.version }, tx);
      return next;
    });
  }
  async function asBuyer(ctx, id) {
    const o = await repos.market.orderById(id);
    if (!o || o.buyerUserId !== ctx.userId) throw notFound("Order");
    return { order: o, sellerCtx: { ...ctx, farmId: o.farmId, role: "worker", membershipId: "buyer" } };
  }
  async function recordMoney(ctx, id, kind, r) {
    return repos.tx.run(async (tx) => {
      const o = await repos.orders.findById(ctx.farmId, id, tx);
      if (!o) throw notFound("Order");
      if (!o.incomeId) throw new AppError("INVALID_STATE_TRANSITION", "Accept the order before recording payments");
      if (o.status === "cancelled" && kind === "payment") throw new AppError("INVALID_STATE_TRANSITION", "This order is cancelled");
      const out = await d.finance.settle(ctx, "income", o.incomeId, kind, { date: r.date, amountMinor: r.amount.amountMinor, accountId: r.accountId, ...defined({ method: r.method, reference: r.reference, description: r.note, orderId: o.id }) }, tx);
      const now = clock.now();
      const pay = { id: newId(), farmId: ctx.farmId, orderId: o.id, kind, date: r.date, amount: r.amount, method: r.method, transactionId: out.transaction.id, accountId: r.accountId, ...defined({ reference: r.reference, note: r.note }), createdBy: ctx.userId, createdAt: now, updatedAt: now };
      await repos.orderPayments.insert(pay, tx);
      const paid = out.document.amountPaid;
      const status = paid.amountMinor <= 0 ? kind === "refund" ? "refunded" : "unpaid" : paid.amountMinor >= o.total.amountMinor ? "paid" : "partially_paid";
      const next = await repos.orders.update(ctx.farmId, o.id, { amountPaid: paid, paymentStatus: status, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: o.version }, tx);
      await d.audit.record(ctx, { action: `order.${kind}`, entity: "order", entityId: o.id, after: { amountMinor: r.amount.amountMinor, paymentStatus: status } }, tx);
      await d.notifications?.onOrderEvent(ctx, next, { kind: "payment", payment: pay }, tx);
      return { order: orderView(next, "seller"), payment: strip(pay) };
    });
  }
  return {
    // ---- seller: listings
    async createListing(ctx, i) {
      assertCan(ctx, "market.manage");
      const farm = await farmOf(ctx.farmId);
      if (!i.regionCode) {
        if (!farm.countryCode) throw new AppError("VALIDATION_FAILED", "Set your farm's country on the Farm page, or choose a region", [{ path: "regionCode", message: "Choose a region" }]);
        i = { ...i, regionCode: farm.countryCode };
      }
      await validateListing(ctx, farm, i);
      const now = clock.now();
      const rec = { id: newId(), farmId: ctx.farmId, ...defined(i), quantityAvailable: q3(i.quantityAvailable), status: "draft", createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 };
      await repos.tx.run(async (tx) => {
        await repos.listings.insert(rec, tx);
        await d.audit.record(ctx, { action: "listing.created", entity: "market_listing", entityId: rec.id, after: { title: rec.title, priceMinor: rec.price.amountMinor } }, tx);
      });
      return listingView(rec);
    },
    async updateListing(ctx, id, i) {
      assertCan(ctx, "market.manage");
      const farm = await farmOf(ctx.farmId);
      const cur = await repos.listings.findById(ctx.farmId, id);
      if (!cur) throw notFound("Listing");
      if (cur.status === "closed") throw new AppError("INVALID_STATE_TRANSITION", "A closed listing cannot be edited");
      await validateListing(ctx, farm, i);
      const { version, ...fields } = i;
      const next = await repos.listings.update(ctx.farmId, id, { ...fields, quantityAvailable: q3(i.quantityAvailable), updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version });
      if (!next) throw new AppError("VERSION_CONFLICT", "This listing was changed by someone else", { serverVersion: cur.version });
      return listingView(next);
    },
    /** draft → active ⇄ paused; any → closed. Sold-out listings come back when an order is cancelled or quantity is added. */
    async setListingStatus(ctx, id, status) {
      assertCan(ctx, "market.manage");
      const cur = await repos.listings.findById(ctx.farmId, id);
      if (!cur) throw notFound("Listing");
      if (cur.status === "closed") throw new AppError("INVALID_STATE_TRANSITION", "This listing is closed");
      if (status === "active" && cur.quantityAvailable <= 0) throw new AppError("VALIDATION_FAILED", "Add quantity before activating the listing");
      const next = await repos.listings.update(ctx.farmId, id, { status, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: cur.version });
      return listingView(next);
    },
    async myListings(ctx, q8) {
      assertCan(ctx, "market.read");
      return (await repos.listings.find(ctx.farmId, { ...q8.status ? { where: { status: q8.status } } : {}, sort: [{ field: "createdAt", dir: -1 }] })).map(listingView);
    },
    // ---- buyer: browse and order
    async browse(_ctx, q8) {
      const rows = await repos.market.activeListings({ ...q8.category ? { category: q8.category } : {}, ...q8.region ? { regionCode: q8.region } : {}, ...q8.q ? { text: q8.q } : {}, limit: q8.limit });
      return Promise.all(rows.map(publicListing));
    },
    async listing(_ctx, id) {
      const l = await repos.market.listingById(id);
      if (!l || l.status !== "active") throw notFound("Listing");
      return publicListing(l);
    },
    /** A buyer places an order. Price comes from the listing; quantity is reserved when the seller accepts. */
    async placeOrder(ctx, r) {
      const listing = await repos.market.listingById(r.listingId);
      if (!listing || listing.status !== "active") throw notFound("Listing");
      const sellerMembership = await repos.memberships.findActive(listing.farmId, ctx.userId);
      if (sellerMembership) throw new AppError("VALIDATION_FAILED", "You cannot order from your own farm's listing");
      if (r.buyerFarmId && !await repos.memberships.findActive(r.buyerFarmId, ctx.userId)) throw notFound("Farm");
      if (!listing.fulfilmentOptions.includes(r.fulfilment)) throw new AppError("VALIDATION_FAILED", `This seller offers ${listing.fulfilmentOptions.join(" or ")}`);
      if (r.fulfilment !== "pickup" && !r.deliveryAddress) throw new AppError("VALIDATION_FAILED", "Give a delivery address");
      if (listing.minOrderQuantity && r.quantity < listing.minOrderQuantity) throw new AppError("VALIDATION_FAILED", `The minimum order is ${listing.minOrderQuantity} ${listing.unit}`);
      if (r.quantity > listing.quantityAvailable) throw new AppError("INSUFFICIENT_STOCK", `Only ${listing.quantityAvailable} ${listing.unit} available`, { available: listing.quantityAvailable });
      const sellerCtx = { ...ctx, farmId: listing.farmId, role: "worker", membershipId: "buyer" };
      return repos.tx.run(async (tx) => {
        const now = clock.now();
        const total = { amountMinor: Math.round(listing.price.amountMinor * r.quantity), currency: listing.price.currency };
        const order = {
          id: newId(),
          farmId: listing.farmId,
          orderNumber: await repos.counters.next("order", listing.farmId, tx),
          channel: "marketplace",
          listingId: listing.id,
          buyerUserId: ctx.userId,
          ...defined({ buyerFarmId: r.buyerFarmId, buyerName: r.buyerName ?? (await repos.users.findById(ctx.userId, tx))?.fullName ?? "Buyer", buyerPhone: r.buyerPhone, deliveryAddress: r.deliveryAddress, notes: r.notes }),
          fulfilment: r.fulfilment,
          lines: [{ category: listing.category, description: listing.title, quantity: r.quantity, unit: listing.unit, unitPrice: listing.price, total }],
          subtotal: total,
          total,
          status: "pending",
          statusHistory: [{ status: "pending", at: now, by: ctx.userId }],
          paymentStatus: "unpaid",
          amountPaid: { amountMinor: 0, currency: total.currency },
          createdBy: ctx.userId,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        await repos.orders.insert(order, tx);
        await d.audit.record(sellerCtx, { action: "order.placed", entity: "order", entityId: order.id, after: { listingId: listing.id, quantity: r.quantity, totalMinor: total.amountMinor } }, tx);
        await d.notifications?.onOrderEvent(sellerCtx, order, { kind: "placed" }, tx);
        return orderView(order, "buyer", null);
      });
    },
    async myPurchases(ctx) {
      const rows = await repos.market.ordersForBuyer(ctx.userId);
      return Promise.all(rows.map(async (o) => orderView(o, "buyer", ["pending", "cancelled"].includes(o.status) ? null : await sellerContact(o.farmId))));
    },
    async buyerOrder(ctx, id) {
      const { order } = await asBuyer(ctx, id);
      return orderView(order, "buyer", ["pending", "cancelled"].includes(order.status) ? null : await sellerContact(order.farmId));
    },
    async buyerAct(ctx, id, to, reason) {
      const { sellerCtx } = await asBuyer(ctx, id);
      const next = await transition(sellerCtx, "buyer", id, to, reason ? { reason } : {});
      return orderView(next, "buyer", await sellerContact(next.farmId));
    },
    // ---- seller: orders
    async sellerOrders(ctx, q8) {
      assertCan(ctx, "market.read");
      const where = {};
      if (q8.status) where["status"] = q8.status;
      if (q8.channel) where["channel"] = q8.channel;
      return (await repos.orders.find(ctx.farmId, { where, sort: [{ field: "createdAt", dir: -1 }] })).map((o) => orderView(o, "seller"));
    },
    async sellerOrder(ctx, id) {
      assertCan(ctx, "market.read");
      const o = await repos.orders.findById(ctx.farmId, id);
      if (!o) throw notFound("Order");
      const payments = await repos.orderPayments.find(ctx.farmId, { where: { orderId: id }, sort: [{ field: "date", dir: 1 }] });
      return { ...orderView(o, "seller"), payments: payments.map(strip) };
    },
    async sellerAct(ctx, id, to, extra = {}) {
      assertCan(ctx, "market.manage");
      return orderView(await transition(ctx, "seller", id, to, extra), "seller");
    },
    recordPayment(ctx, id, r) {
      assertCan(ctx, "payment.record");
      return recordMoney(ctx, id, "payment", r);
    },
    recordRefund(ctx, id, r) {
      assertCan(ctx, "money.record");
      return recordMoney(ctx, id, "refund", r);
    },
    // ---- buyer management
    async buyerDetail(ctx, id) {
      assertCan(ctx, "market.read");
      const b = await repos.buyers.findById(ctx.farmId, id);
      if (!b) throw notFound("Buyer");
      const [orders, incomes] = await Promise.all([repos.orders.find(ctx.farmId, { where: { buyerId: id }, sort: [{ field: "createdAt", dir: -1 }] }), repos.incomes.find(ctx.farmId, { where: { buyerId: id } })]);
      const open = incomes.filter((x) => x.status === "unpaid" || x.status === "partially_paid");
      return {
        buyer: strip(b),
        orders: orders.map((o) => orderView(o, "seller")),
        totals: {
          orders: orders.length,
          deliveredOrders: orders.filter((o) => o.status === "delivered" || o.status === "completed").length,
          salesMinor: incomes.filter((x) => x.status !== "cancelled").reduce((t, x) => t + x.amount.amountMinor, 0),
          outstandingMinor: open.reduce((t, x) => t + x.amount.amountMinor - x.amountPaid.amountMinor, 0)
        }
      };
    },
    async updateBuyer(ctx, id, r) {
      assertCan(ctx, "market.manage");
      const cur = await repos.buyers.findById(ctx.farmId, id);
      if (!cur) throw notFound("Buyer");
      const { version, ...fields } = r;
      const next = await repos.buyers.update(ctx.farmId, id, { ...fields, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: version });
      if (!next) throw new AppError("VERSION_CONFLICT", "This buyer was changed by someone else");
      return strip(next);
    }
  };
}

// src/services/rules.service.ts
function createRulesService(d) {
  const { repos, clock } = d;
  async function stored(ctx, key, tx) {
    return (await repos.alertRules.find(ctx.farmId, { where: { ruleKey: key }, limit: 1 }, tx))[0] ?? null;
  }
  function merge(key, r) {
    const def = RULE_DEFINITIONS[key];
    return {
      key,
      enabled: r?.enabled ?? true,
      params: effectiveParams(key, r?.parameters),
      ...r?.severity ? { severity: r.severity } : {},
      channels: r?.channels?.length ? r.channels : def.defaultChannels,
      notifyRoles: r?.notifyRoles?.length ? r.notifyRoles : def.defaultRoles,
      cooldownHours: r?.cooldownHours ?? 24,
      ...r?.flockIds?.length ? { flockIds: r.flockIds } : {},
      ...r?.houseIds?.length ? { houseIds: r.houseIds } : {}
    };
  }
  async function config(ctx, key, tx) {
    return merge(key, await stored(ctx, key, tx));
  }
  return {
    config,
    /** The rule governing an alert type (undefined for alert types outside the catalog, e.g. biosecurity). */
    async forAlertType(ctx, alertType, tx) {
      const key = RULE_FOR_ALERT[alertType];
      return key ? config(ctx, key, tx) : void 0;
    },
    async list(ctx) {
      assertCan(ctx, "farm.read");
      const rows = await repos.alertRules.find(ctx.farmId);
      return Object.keys(RULE_DEFINITIONS).map((key) => {
        const def = RULE_DEFINITIONS[key];
        const r = rows.find((x) => x.ruleKey === key) ?? null;
        const eff = merge(key, r);
        return {
          ...eff,
          label: def.label,
          description: def.description,
          baseline: def.baseline,
          alertTypes: def.alertTypes,
          customised: !!r,
          defaultSeverity: def.defaultSeverity,
          parameters: def.params.map((p6) => ({ ...p6, value: eff.params[p6.key] ?? null, setByFarm: r?.parameters?.[p6.key] !== void 0 }))
        };
      });
    },
    async update(ctx, key, body) {
      assertCan(ctx, "alert.manage");
      if (!RULE_DEFINITIONS[key]) throw notFound("Rule");
      try {
        validateRuleParams(key, body.parameters ?? {});
      } catch (e) {
        throw new AppError("VALIDATION_FAILED", e.message);
      }
      if (body.channels && !body.channels.includes("in_app")) throw new AppError("VALIDATION_FAILED", "In-app is always kept, so the alert list stays complete");
      for (const f of body.flockIds ?? []) if (!await repos.flocks.findById(ctx.farmId, f)) throw notFound("Flock");
      for (const h of body.houseIds ?? []) if (!await repos.houses.findById(ctx.farmId, h)) throw notFound("House");
      return repos.tx.run(async (tx) => {
        const cur = await stored(ctx, key, tx);
        const now = clock.now();
        const fields = {
          enabled: body.enabled,
          parameters: body.parameters && Object.keys(body.parameters).length ? body.parameters : void 0,
          severity: body.severity,
          channels: body.channels,
          notifyRoles: body.notifyRoles,
          cooldownHours: body.cooldownHours ?? 24,
          flockIds: body.flockIds?.length ? body.flockIds : void 0,
          houseIds: body.houseIds?.length ? body.houseIds : void 0
        };
        if (cur) await repos.alertRules.update(ctx.farmId, cur.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: cur.version }, tx);
        else await repos.alertRules.insert({ id: newId(), farmId: ctx.farmId, ruleKey: key, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== void 0)), enabled: body.enabled, cooldownHours: fields.cooldownHours, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 }, tx);
        await d.audit.record(ctx, { action: "alert_rule.updated", entity: "alert_rule", entityId: key, before: cur ? { enabled: cur.enabled, parameters: cur.parameters } : void 0, after: { enabled: body.enabled, parameters: body.parameters } }, tx);
        return merge(key, await stored(ctx, key, tx));
      });
    },
    /** Back to catalog defaults. */
    async reset(ctx, key) {
      assertCan(ctx, "alert.manage");
      const cur = await stored(ctx, key);
      if (cur) await repos.alertRules.update(ctx.farmId, cur.id, { enabled: true, parameters: void 0, severity: void 0, channels: void 0, notifyRoles: void 0, cooldownHours: 24, flockIds: void 0, houseIds: void 0, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: cur.version });
      return merge(key, null);
    }
  };
}

// src/services/notification.service.ts
var RANK = { info: 0, warning: 1, critical: 2 };
var BACKOFF_MS = [6e4, 5 * 6e4, 30 * 6e4, 2 * 36e5];
var LEASE_MS = 5 * 6e4;
var DEFAULT_PREFS = (userId, now) => ({
  id: newId(),
  userId,
  pushEnabled: true,
  emailEnabled: true,
  pushMinSeverity: "warning",
  emailMinSeverity: "warning",
  createdAt: now,
  updatedAt: now
});
var minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
function quietUntil(now, q8) {
  if (!q8 || q8.start === q8.end) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: q8.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const t = Number(parts.find((p6) => p6.type === "hour").value) * 60 + Number(parts.find((p6) => p6.type === "minute").value);
  const s2 = minutesOf(q8.start);
  const e = minutesOf(q8.end);
  const inside = s2 < e ? t >= s2 && t < e : t >= s2 || t < e;
  if (!inside) return null;
  const wait = (e - t + 1440) % 1440;
  return new Date(Math.floor(now.getTime() / 6e4) * 6e4 + wait * 6e4);
}
function createNotificationService(d) {
  const { repos, clock } = d;
  const providerFor = (channel) => d.providers.find((p6) => p6.channel === channel);
  async function prefsOf(userId) {
    return await repos.notificationPreferences.get(userId) ?? DEFAULT_PREFS(userId, clock.now());
  }
  async function preferencesView(userId) {
    const p6 = await prefsOf(userId);
    return {
      pushEnabled: p6.pushEnabled,
      emailEnabled: p6.emailEnabled,
      pushMinSeverity: p6.pushMinSeverity,
      emailMinSeverity: p6.emailMinSeverity,
      ...p6.mutedRuleKeys ? { mutedRuleKeys: p6.mutedRuleKeys } : {},
      quietHours: p6.quietHours ?? null,
      categories: NOTIFICATION_CATEGORIES.map((key) => ({
        key,
        ...NOTIFICATION_CATEGORY_INFO[key],
        push: p6.categories?.[key]?.push !== false,
        email: p6.categories?.[key]?.email !== false
      }))
    };
  }
  async function notify(n, tx) {
    const now = clock.now();
    const channels = new Set(n.channels ?? ["in_app", "push"]);
    channels.add("in_app");
    const candidates = [];
    for (const userId of [...new Set(n.userIds)]) {
      const prefs = await prefsOf(userId);
      const legacyMuted = !!n.ruleKey && !!prefs.mutedRuleKeys?.includes(n.ruleKey);
      const cat = prefs.categories?.[n.category];
      for (const channel of channels) {
        if (channel === "push" && (!prefs.pushEnabled || cat?.push === false || legacyMuted || n.severityThreshold && RANK[n.severity] < RANK[prefs.pushMinSeverity])) continue;
        if (channel === "email" && (!prefs.emailEnabled || cat?.email === false || legacyMuted || n.severityThreshold && RANK[n.severity] < RANK[prefs.emailMinSeverity])) continue;
        if (n.skip && await n.skip(userId, channel)) continue;
        const wait = channel === "push" && n.severity !== "critical" ? quietUntil(now, prefs.quietHours) : null;
        candidates.push({
          id: newId(),
          userId,
          ...n.farmId ? { farmId: n.farmId } : {},
          channel,
          status: channel === "in_app" ? "delivered" : "queued",
          title: n.title.slice(0, 200),
          ...n.body ? { body: n.body.slice(0, 2e3) } : {},
          ...n.link ? { link: n.link } : {},
          ...n.alertId ? { alertId: n.alertId } : {},
          ...n.ruleKey ? { ruleKey: n.ruleKey } : {},
          category: n.category,
          dedupeKey: `${n.eventKey}:${userId}:${channel}`,
          severity: n.severity,
          ...channel === "in_app" ? { deliveredAt: now } : { nextAttemptAt: wait ?? now },
          attempts: 0,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    if (!candidates.length) return [];
    const existing = await repos.notifications.existingDedupeKeys(candidates.map((c) => c.dedupeKey), tx);
    const fresh = candidates.filter((c) => !existing.has(c.dedupeKey));
    if (fresh.length) await repos.notifications.insertMany(fresh, tx);
    return fresh;
  }
  const activeMembers = async (farmId, tx) => (await repos.memberships.findByFarm(farmId, tx)).filter((m) => m.status === "active" && m.userId);
  const money = (m) => `${(m.amountMinor / 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${m.currency}`;
  return {
    notify,
    /**
     * Fan an alert out to the people the rule names, under the rule's category. A new alert notifies once; an
     * escalation once per severity; a reopened alert at most once per cooldown window (and never within the cooldown
     * of the last notification for it).
     */
    async onAlert(ctx, alert, rule, reason, tx) {
      const roles = rule?.notifyRoles ?? ["owner", "admin", "farm_manager"];
      const ruleKey = RULE_FOR_ALERT[alert.ruleType];
      const category = ruleKey ? CATEGORY_FOR_RULE[ruleKey] : "inventory_low";
      const cooldownMs = (rule?.cooldownHours ?? 24) * 36e5;
      const now = clock.now();
      const members = (await activeMembers(ctx.farmId, tx)).filter((m) => roles.includes(m.role) && (alert.ruleType !== "payment_overdue" || can(m.role, "money.read")));
      const eventKey = reason === "new" ? `alert:${alert.id}:new` : reason === "escalated" ? `alert:${alert.id}:escalated:${alert.severity}` : `alert:${alert.id}:reopened:${Math.floor(now.getTime() / cooldownMs)}`;
      return notify(
        {
          farmId: ctx.farmId,
          category,
          eventKey,
          userIds: members.map((m) => m.userId),
          title: alert.title,
          ...alert.message ? { body: alert.message } : {},
          severity: alert.severity,
          link: { entity: "alert", id: alert.id, path: `/farms/${ctx.farmId}/alerts/${alert.id}` },
          channels: (rule?.channels ?? ["in_app"]).filter((c) => c === "in_app" || c === "push" || c === "email"),
          severityThreshold: true,
          alertId: alert.id,
          ...ruleKey ? { ruleKey } : {},
          skip: reason === "reopened" ? async (userId, channel) => {
            const last = await repos.notifications.lastForAlert(alert.id, userId, channel);
            return !!last && now.getTime() - last.createdAt.getTime() < cooldownMs;
          } : void 0
        },
        tx
      );
    },
    /** Hourly: tasks due today, and overdue tasks, told once each to the assignee (or everyone who can do tasks). */
    async notifyTasksDue(ctx, tx) {
      const farm = await repos.farms.findById(ctx.farmId, tx);
      if (!farm) return 0;
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const tasks = (await repos.tasks.find(ctx.farmId, { where: { status: ["open", "in_progress"] } }, tx)).filter((t) => t.dueDate && t.dueDate <= today);
      if (!tasks.length) return 0;
      const members = await activeMembers(ctx.farmId, tx);
      const doers = members.filter((m) => can(m.role, "task.complete")).map((m) => m.userId);
      let sent = 0;
      for (const t of tasks) {
        const overdue = t.dueDate < today;
        const assignee = t.assigneeUserId && members.some((m) => m.userId === t.assigneeUserId) ? [t.assigneeUserId] : null;
        sent += (await notify(
          {
            farmId: ctx.farmId,
            category: "task_due",
            eventKey: overdue ? `task:${t.id}:overdue` : `task:${t.id}:due:${t.dueDate}`,
            userIds: assignee ?? doers,
            title: `${overdue ? "Overdue" : "Due today"}: ${t.title}`,
            ...t.description ? { body: t.description } : {},
            severity: overdue || t.priority === "urgent" ? "warning" : "info",
            link: { entity: "task", id: t.id, path: "/tasks" }
          },
          tx
        )).length;
      }
      return sent;
    },
    /**
     * Orders and payments, told to the other side (never to the person who made the change): the selling farm's
     * people who handle orders (or money, for payments) and the buyer who placed the order.
     */
    async onOrderEvent(ctx, order, event, tx) {
      const members = await activeMembers(order.farmId, tx);
      const line = order.lines[0];
      const what = line ? `${line.quantity} ${line.unit} ${line.description}` : "the order";
      const others = (ids) => ids.filter((id) => !!id && id !== ctx.userId);
      const sellers = (perm) => members.filter((m) => can(m.role, perm)).map((m) => m.userId);
      const link = { entity: "order", id: order.id, path: "/market" };
      if (event.kind === "placed") {
        return notify({ farmId: order.farmId, category: "order_update", eventKey: `order:${order.id}:placed`, userIds: others(sellers("market.manage")), title: `New order #${order.orderNumber}`, body: `${order.buyerName ?? "A buyer"} ordered ${what}.`, severity: "warning", link }, tx);
      }
      if (event.kind === "status") {
        const label = { accepted: "accepted", preparing: "being prepared", dispatched: "on its way", delivered: "delivered", completed: "completed", cancelled: "cancelled" };
        const toBuyer = event.actor === "seller";
        return notify(
          {
            farmId: order.farmId,
            category: "order_update",
            eventKey: `order:${order.id}:${event.to}`,
            userIds: toBuyer ? others([order.buyerUserId]) : others(sellers("market.manage")),
            title: toBuyer ? `Your order #${order.orderNumber} is ${label[event.to] ?? event.to}` : `Order #${order.orderNumber} ${event.to === "cancelled" ? "cancelled by the buyer" : `marked ${label[event.to] ?? event.to} by the buyer`}`,
            body: what,
            severity: event.to === "cancelled" ? "warning" : "info",
            link
          },
          tx
        );
      }
      const p6 = event.payment;
      const refund = p6.kind === "refund";
      return notify(
        {
          farmId: order.farmId,
          category: "payment_update",
          eventKey: `payment:${p6.id}`,
          userIds: others([...sellers("money.read"), order.buyerUserId]),
          title: `${refund ? "Refund" : "Payment"} of ${money(p6.amount)} on order #${order.orderNumber}`,
          body: what,
          severity: "info",
          link
        },
        tx
      );
    },
    /** The delivery worker: sends queued push and email notifications that are due. Safe to run often and in parallel runs (a notification is sent at most once per device). */
    async deliverDue(limit = 100) {
      const now = clock.now();
      const due = await repos.notifications.due(now, limit);
      let sent = 0;
      let failed = 0;
      let retrying = 0;
      for (const n of due) {
        if (!n.nextAttemptAt || !await repos.notifications.claim(n.id, n.nextAttemptAt, new Date(now.getTime() + LEASE_MS))) continue;
        const provider = providerFor(n.channel);
        const fail = async (error, retryable, extra = {}) => {
          const attempts = n.attempts + 1;
          if (!retryable || attempts > BACKOFF_MS.length) {
            await repos.notifications.update(n.id, { ...extra, status: "failed", attempts, error, updatedAt: now });
            failed++;
          } else {
            await repos.notifications.update(n.id, { ...extra, attempts, error, nextAttemptAt: new Date(now.getTime() + BACKOFF_MS[attempts - 1]), updatedAt: now });
            retrying++;
          }
        };
        if (!provider) {
          await fail(`No provider for ${n.channel}`, false);
          continue;
        }
        let pushTokens;
        let email;
        const already = new Set(n.sentTokens ?? []);
        if (n.channel === "push") {
          pushTokens = (await repos.pushDevices.activeForUser(n.userId)).map((x) => x.token).filter((t) => !already.has(t));
          if (!pushTokens.length) {
            if (already.size) {
              await repos.notifications.update(n.id, { status: "sent", sentAt: now, updatedAt: now });
              sent++;
            } else await fail("No registered devices", false);
            continue;
          }
        } else {
          email = (await repos.users.findById(n.userId))?.email;
          if (!email) {
            await fail("No email address", false);
            continue;
          }
        }
        try {
          const r = await provider.send({ notificationId: n.id, userId: n.userId, title: n.title, body: n.body ?? "", ...n.severity ? { severity: n.severity } : {}, ...n.link ? { link: n.link } : {}, ...n.category ? { category: n.category } : {}, ...email ? { email } : {}, ...pushTokens ? { pushTokens } : {} });
          if (r.invalidTokens?.length) await repos.pushDevices.disableTokens(r.invalidTokens, now);
          const delivered = pushTokens ? [...already, ...r.sentTokens ?? pushTokens.filter((t) => !r.retryTokens?.includes(t) && !r.invalidTokens?.includes(t))] : void 0;
          if (r.retryTokens?.length) {
            await fail(`${r.retryTokens.length} device(s) could not be reached`, true, delivered ? { sentTokens: delivered } : {});
            continue;
          }
          await repos.notifications.update(n.id, { status: "sent", sentAt: now, attempts: n.attempts + 1, ...delivered ? { sentTokens: delivered } : {}, ...r.providerMessageId ? { providerMessageId: r.providerMessageId } : {}, error: void 0, updatedAt: now });
          sent++;
        } catch (e) {
          await fail(e.message.slice(0, 500), e.retryable !== false);
        }
      }
      return { sent, failed, retrying };
    },
    // ---- the person's side
    async inbox(ctx, q8) {
      const rows = await repos.notifications.forUser(ctx.userId, q8);
      return {
        unread: await repos.notifications.unreadCount(ctx.userId),
        items: rows.map(({ createdAt, updatedAt: _u, deliveredAt: _d, readAt, sentAt: _s, nextAttemptAt: _n, attempts: _a, providerMessageId: _p, error: _e, dedupeKey: _k, sentTokens: _t, ...r }) => ({ ...r, createdAt: createdAt.toISOString(), readAt: readAt?.toISOString() ?? null }))
      };
    },
    async markRead(ctx, ids) {
      return { marked: await repos.notifications.markRead(ctx.userId, ids, clock.now()), unread: await repos.notifications.unreadCount(ctx.userId) };
    },
    /** A device token belongs to one person: registering it moves it to whoever is signed in on that phone. */
    async registerDevice(ctx, r) {
      const now = clock.now();
      const d0 = await repos.pushDevices.upsertByToken({ id: newId(), userId: ctx.userId, platform: r.platform, token: r.token, ...r.deviceName ? { deviceName: r.deviceName } : {}, lastSeenAt: now, createdAt: now, updatedAt: now });
      return { id: d0.id, platform: d0.platform, deviceName: d0.deviceName ?? null, lastSeenAt: d0.lastSeenAt.toISOString() };
    },
    async removeDevice(ctx, id) {
      if (!await repos.pushDevices.remove(ctx.userId, id)) throw notFound("Device");
    },
    preferences: (ctx) => preferencesView(ctx.userId),
    async setPreferences(ctx, r) {
      const cur = await prefsOf(ctx.userId);
      if (r.mutedRuleKeys?.some((k) => !k)) throw new AppError("VALIDATION_FAILED", "Unknown rule");
      if (r.quietHours) {
        try {
          new Intl.DateTimeFormat("en", { timeZone: r.quietHours.timezone });
        } catch {
          throw new AppError("VALIDATION_FAILED", "Unknown time zone", [{ path: "quietHours.timezone", message: "Unknown time zone" }]);
        }
      }
      const { categories, quietHours, ...rest } = r;
      await repos.notificationPreferences.put({
        ...cur,
        ...rest,
        ...r.mutedRuleKeys ? {} : { mutedRuleKeys: void 0 },
        categories: categories === void 0 ? cur.categories : { ...cur.categories ?? {}, ...categories },
        quietHours: quietHours === void 0 ? cur.quietHours : quietHours ?? void 0,
        updatedAt: clock.now()
      });
      return preferencesView(ctx.userId);
    }
  };
}

// src/services/weather.service.ts
var CACHE_TTL_MS = 60 * 6e4;
var FORECAST_DAYS = 7;
var PAST_DAYS = 7;
var locationKey = (lat, lng) => `${(Math.round(lat * 20) / 20).toFixed(2)},${(Math.round(lng * 20) / 20).toFixed(2)}`;
function createWeatherService(d) {
  const { repos, clock, provider } = d;
  async function report(lat, lng) {
    const key = locationKey(lat, lng);
    const cached = await repos.weather.getCache(provider.name, key, "daily");
    const now = clock.now();
    if (cached && cached.expiresAt > now) return { report: cached.data, fetchedAt: cached.fetchedAt, stale: false, key };
    try {
      const r = await provider.fetch(Number(key.split(",")[0]), Number(key.split(",")[1]), { forecastDays: FORECAST_DAYS, pastDays: PAST_DAYS });
      await repos.weather.putCache({ id: newId(), provider: provider.name, locationKey: key, kind: "daily", data: r, fetchedAt: now, expiresAt: new Date(now.getTime() + CACHE_TTL_MS), createdAt: now, updatedAt: now });
      const observed = r.daily.filter((x) => x.date < r.today).map((x) => ({ id: newId(), provider: provider.name, locationKey: key, ...x, createdAt: now, updatedAt: now }));
      await repos.weather.upsertObservations(observed);
      return { report: r, fetchedAt: now, stale: false, key };
    } catch (e) {
      if (cached) return { report: cached.data, fetchedAt: cached.fetchedAt, stale: true, key };
      throw new AppError("WEATHER_UNAVAILABLE", `Weather is not available right now (${e.message})`);
    }
  }
  function requireLocation(farm) {
    if (!farm.location) throw new AppError("VALIDATION_FAILED", "Set the farm's location (latitude and longitude) to see weather");
    return farm.location;
  }
  async function forFarm(ctx, opts = {}) {
    const farm = await repos.farms.findById(ctx.farmId);
    if (!farm) throw notFound("Farm");
    const loc = requireLocation(farm);
    const r = await report(loc.lat, loc.lng);
    const today = localDateOf(clock.now(), farm.settings.timezone);
    const rule = await d.rules.config(ctx, "weather_risk");
    const historyDays = opts.historyDays ?? rule.params["historyDays"] ?? 30;
    const history = await repos.weather.observations(r.key, addDays(today, -historyDays), addDays(today, -1));
    const forecast = r.report.daily.filter((x) => x.date >= today);
    const risk = weatherRisks(forecast, history, rule.params);
    return {
      location: { lat: loc.lat, lng: loc.lng, key: r.key, label: farm.locationLabel ?? null },
      provider: provider.name,
      fetchedAt: r.fetchedAt.toISOString(),
      stale: r.stale,
      current: r.report.current,
      forecast,
      history: history.map(({ id: _i, provider: _p, locationKey: _k, createdAt: _c, updatedAt: _u, ...h }) => h),
      risks: rule.enabled ? risk.risks : [],
      baseline: risk.baseline
    };
  }
  return {
    forFarm,
    async get(ctx, q8) {
      assertCan(ctx, "farm.read");
      return forFarm(ctx, q8);
    },
    /** Hourly: refresh each distinct farm location once (the cache makes repeated farms free). */
    async refreshAll() {
      const seen = /* @__PURE__ */ new Set();
      let failed = 0;
      for (const id of await repos.farms.listIds()) {
        const f = await repos.farms.findById(id);
        if (!f?.location) continue;
        const key = locationKey(f.location.lat, f.location.lng);
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const r = await report(f.location.lat, f.location.lng);
          if (r.stale) failed++;
        } catch {
          failed++;
        }
      }
      return { locations: seen.size, failed };
    }
  };
}

// src/services/intelligence.service.ts
var LAYING2 = /* @__PURE__ */ new Set(["layer", "breeder", "custom"]);
function createIntelligenceService(d) {
  const { repos, clock, alerts } = d;
  const round = (n, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
  async function flockDays(ctx, flock, from, to, tx) {
    const start = flock.placementDate && flock.placementDate > from ? flock.placementDate : from;
    if (start > to) return [];
    const range = { field: "date", from: start, to };
    const [events, records, eggs, feed, water] = await Promise.all([
      d.flocks.ledger.loadEvents(ctx, flock.id, tx),
      repos.dailyRecords.find(ctx.farmId, { where: { flockId: flock.id }, range }, tx),
      repos.eggRecords.find(ctx.farmId, { where: { flockId: flock.id }, range }, tx),
      repos.feedConsumption.find(ctx.farmId, { where: { flockId: flock.id, kind: "consumption" }, range }, tx),
      repos.waterRecords.find(ctx.farmId, { where: { flockId: flock.id }, range }, tx)
    ]);
    const ledger = events.map(toLedger);
    const live = effectiveEvents(ledger);
    return dateRange(start, to).map((date) => {
      const aliveStart = population(ledger, addDays(date, -1)).alive;
      const dayDeaths = live.filter((e) => e.type === "mortality" && e.date === date);
      const recorded = records.some((r) => r.date === date) || dayDeaths.length > 0;
      const egg = eggs.find((e) => e.date === date);
      const dayFeed = feed.filter((f) => f.date === date);
      const w = water.find((x) => x.date === date);
      return {
        date,
        aliveStart,
        deaths: recorded ? dayDeaths.reduce((t, e) => t + (e.birds ?? 0), 0) : null,
        henDayPercent: egg && aliveStart > 0 ? egg.collected / aliveStart * 100 : null,
        feedGPerBird: dayFeed.length && aliveStart > 0 ? dayFeed.reduce((t, f) => t + f.quantityKg, 0) * 1e3 / aliveStart : null,
        waterMlPerBird: w && aliveStart > 0 ? w.litres * 1e3 / aliveStart : null
      };
    });
  }
  const valueOf = (m, day) => m === "mortality" ? day.deaths : m === "egg_production" ? day.henDayPercent : m === "feed_consumption" ? day.feedGPerBird : day.waterMlPerBird;
  const ALERT_TYPE = { mortality: "mortality_spike", egg_production: "egg_drop", feed_consumption: "feed_change", water_consumption: "water_abnormal" };
  const UNIT = { mortality: "deaths", egg_production: "% hen-day", feed_consumption: "g feed per bird", water_consumption: "ml water per bird" };
  function judgeDay(m, days, date, p6) {
    const day = days.find((x) => x.date === date);
    const value = day ? valueOf(m, day) : null;
    if (value === null || value === void 0 || !day) return null;
    const window = days.filter((x) => x.date < date && x.date >= addDays(date, -(p6["windowDays"] ?? 7))).map((x) => valueOf(m, x)).filter((v) => v !== null);
    const b = baselineOf(window, p6["minBaselineDays"] ?? 3);
    if (!b) return null;
    const avg = round(b.mean, m === "mortality" ? 1 : 1);
    if (m === "mortality") {
      const dev2 = deviationFrom(value, b, { direction: "above", deviationPercent: p6["deviationPercent"] ?? 50, ...p6["minExtraBirds"] !== void 0 ? { minAbsoluteChange: p6["minExtraBirds"] } : {} });
      const rate = day.aliveStart > 0 ? value / day.aliveStart * 100 : 0;
      const overLimit = p6["dailyRatePercentMax"] !== void 0 && rate > p6["dailyRatePercentMax"];
      return { triggered: dev2.triggered || overLimit, value, baseline: b, reason: dev2.triggered ? `${value} deaths, ${round(dev2.deviationPercent ?? 0, 0)}% above this flock's recent average of ${avg} a day` : `${value} deaths (${round(rate, 2)}% of birds), above the farm's daily limit of ${p6["dailyRatePercentMax"]}%` };
    }
    if (m === "egg_production") {
      const dev2 = deviationFrom(value, b, { direction: "below", deviationPercent: p6["dropPercent"] ?? 10 });
      const underMin = p6["henDayPercentMin"] !== void 0 && value < p6["henDayPercentMin"];
      return { triggered: dev2.triggered || underMin, value, baseline: b, reason: dev2.triggered ? `hen-day production ${round(value)}%, ${round(-(dev2.deviationPercent ?? 0), 0)}% below this flock's recent ${avg}%` : `hen-day production ${round(value)}%, below the farm's minimum of ${p6["henDayPercentMin"]}%` };
    }
    const dev = deviationFrom(value, b, { direction: "both", deviationPercent: p6["deviationPercent"] ?? 20 });
    return { triggered: dev.triggered, value, baseline: b, reason: `${round(value, 0)} ${UNIT[m]}, ${round(Math.abs(dev.deviationPercent ?? 0), 0)}% ${dev.direction === "above" ? "above" : "below"} this flock's recent ${round(b.mean, 0)}` };
  }
  async function resolveMissing(ctx, ruleType, keep, tx, prefix) {
    for (const a of await repos.alerts.find(ctx.farmId, { where: { ruleType, status: ["open", "acknowledged"] } }, tx)) {
      if ((!prefix || a.dedupKey.startsWith(prefix)) && !keep.has(a.dedupKey)) await alerts.resolve(ctx, a.dedupKey, tx);
    }
  }
  async function evaluateProduction(ctx, farm, m, rule, tx) {
    const today = localDateOf(clock.now(), farm.settings.timezone);
    let raised = 0;
    for (const flock of await repos.flocks.find(ctx.farmId, { where: { status: "active" } }, tx)) {
      if (m === "egg_production" && !LAYING2.has(flock.type)) continue;
      const days = await flockDays(ctx, flock, addDays(today, -((rule.params["windowDays"] ?? 7) + 1)), today, tx);
      const hasToday = (await repos.dailyRecords.find(ctx.farmId, { where: { flockId: flock.id, date: today }, limit: 1 }, tx)).length > 0;
      for (const date of hasToday ? [addDays(today, -1), today] : [addDays(today, -1)]) {
        const j = judgeDay(m, days, date, rule.params);
        if (!j?.triggered) continue;
        raised++;
        await alerts.raise(ctx, { ruleType: ALERT_TYPE[m], severity: "warning", title: `${flock.flockCode}: ${m.replace("_", " ")} on ${date}`, message: `${flock.flockCode} on ${date}: ${j.reason}. Check the birds and the house; contact your veterinarian if it continues.`, dedupKey: `${m}:${flock.id}:${date}`, date, flockId: flock.id, houseId: flock.houseId, values: { value: round(j.value, 2), baselineMean: round(j.baseline.mean, 2), baselineDays: j.baseline.n } }, tx);
      }
    }
    return raised;
  }
  async function profileTarget(ctx, flock, age, tx) {
    const profiles = await repos.broodingProfiles.find(ctx.farmId, { where: { isDefault: true } }, tx);
    const p6 = profiles.find((x) => !x.flockTypes?.length || x.flockTypes.includes(flock.type));
    return p6?.bands.find((b) => age >= b.fromDay && age <= b.toDay)?.targetWeightG;
  }
  const evaluators = {
    mortality: (c, f, r, t) => evaluateProduction(c, f, "mortality", r, t),
    egg_production: (c, f, r, t) => evaluateProduction(c, f, "egg_production", r, t),
    feed_consumption: (c, f, r, t) => evaluateProduction(c, f, "feed_consumption", r, t),
    water_consumption: null,
    // judged when the daily record is saved (same rule parameters), so it is not raised twice
    async weight_variance(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      let raised = 0;
      for (const flock of await repos.flocks.find(ctx.farmId, { where: { status: "active" } }, tx)) {
        const m = await d.flocks.metrics(ctx, flock.id, {});
        if (!m.latestWeighingDate || m.latestWeighingDate < addDays(today, -7) || m.averageWeightG === null) continue;
        const age = ageDays({ ...flock.hatchDate ? { hatchDate: flock.hatchDate } : {}, ...flock.placementDate ? { placementDate: flock.placementDate } : {}, ...flock.ageDaysAtPlacement !== void 0 ? { ageDaysAtPlacement: flock.ageDaysAtPlacement } : {} }, m.latestWeighingDate) ?? 0;
        const target = await profileTarget(ctx, flock, age, tx);
        let reason = null;
        if (target && rule.params["belowTargetPercent"] !== void 0 && m.averageWeightG < target * (1 - rule.params["belowTargetPercent"] / 100)) {
          reason = `average ${round(m.averageWeightG, 0)} g at day ${age}, ${round((target - m.averageWeightG) / target * 100, 0)}% below the farm's target of ${target} g`;
        } else if (!target && m.recentDailyWeightGainG !== null && m.dailyWeightGainG && rule.params["gainDropPercent"] !== void 0 && m.recentDailyWeightGainG < m.dailyWeightGainG * (1 - rule.params["gainDropPercent"] / 100)) {
          reason = `recent gain ${round(m.recentDailyWeightGainG, 0)} g a day, ${round((m.dailyWeightGainG - m.recentDailyWeightGainG) / m.dailyWeightGainG * 100, 0)}% below this flock's own ${round(m.dailyWeightGainG, 0)} g a day`;
        }
        if (!reason) continue;
        raised++;
        await alerts.raise(ctx, { ruleType: "weight_variance", severity: "warning", title: `${flock.flockCode}: weight behind`, message: `${flock.flockCode}: ${reason}.`, dedupKey: `weight:${flock.id}:${m.latestWeighingDate}`, date: m.latestWeighingDate, flockId: flock.id, houseId: flock.houseId, values: { averageWeightG: m.averageWeightG, ...target ? { targetWeightG: target } : {} } }, tx);
      }
      return raised;
    },
    async fcr_variance(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const closed = (await repos.flocks.find(ctx.farmId, { where: { status: "closed" }, sort: [{ field: "closedDate", dir: -1 }] }, tx)).slice(0, 20);
      const pastFcr = /* @__PURE__ */ new Map();
      for (const f of closed) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        if (m.fcr !== null && m.fcrWarning !== "implausibly_low") pastFcr.set(f.type, [...pastFcr.get(f.type) ?? [], m.fcr]);
      }
      const keep = /* @__PURE__ */ new Set();
      for (const flock of await repos.flocks.find(ctx.farmId, { where: { status: "active" } }, tx)) {
        const m = await d.flocks.metrics(ctx, flock.id, {});
        if (m.fcr === null) continue;
        const past = baselineOf(pastFcr.get(flock.type) ?? [], rule.params["minPastFlocks"] ?? 2);
        const ref = rule.params["targetFcr"] ?? past?.mean;
        if (ref === void 0) continue;
        const limit = ref * (1 + (rule.params["abovePercent"] ?? 10) / 100);
        if (m.fcr <= limit) continue;
        keep.add(`fcr:${flock.id}`);
        const basis = rule.params["targetFcr"] !== void 0 ? `the farm's target of ${ref}` : `the farm's past ${flock.type} flocks (${round(ref, 2)}, ${past.n} flocks)`;
        await alerts.raise(ctx, { ruleType: "fcr_variance", severity: "info", title: `${flock.flockCode}: FCR above the farm's usual`, message: `${flock.flockCode}: FCR ${round(m.fcr, 2)}, more than ${rule.params["abovePercent"] ?? 10}% above ${basis}.`, dedupKey: `fcr:${flock.id}`, date: today, flockId: flock.id, houseId: flock.houseId, values: { fcr: round(m.fcr, 3), reference: round(ref, 3) } }, tx);
      }
      await resolveMissing(ctx, "fcr_variance", keep, tx);
      return keep.size;
    },
    inventory: null,
    // stock alerts are raised in every stock transaction and by the hourly job (governed by this rule)
    medicine_expiry: null,
    async vaccination_due(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const code = new Map((await repos.flocks.find(ctx.farmId, {}, tx)).map((f) => [f.id, f.flockCode]));
      const keep = /* @__PURE__ */ new Set();
      for (const v of await repos.vaccinations.find(ctx.farmId, { where: { status: "scheduled" }, range: { field: "dueDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `vaccination:${v.id}`;
        keep.add(key);
        const overdue = v.dueDate < today;
        await alerts.raise(ctx, { ruleType: "vaccination_due", severity: overdue ? "warning" : "info", title: `Vaccination ${overdue ? "overdue" : "due"}: ${code.get(v.flockId) ?? "flock"}`, message: `${v.vaccineName} for ${code.get(v.flockId) ?? "the flock"} ${overdue ? `was due on ${v.dueDate}` : `is due on ${v.dueDate}`}.`, dedupKey: key, date: today, flockId: v.flockId }, tx);
      }
      await resolveMissing(ctx, "vaccination_due", keep, tx);
      return keep.size;
    },
    async vet_appointment(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = /* @__PURE__ */ new Set();
      for (const t of await repos.tasks.find(ctx.farmId, { where: { kind: "vet_appointment", status: ["open", "in_progress"] }, range: { field: "dueDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `vet_appointment:${t.id}`;
        keep.add(key);
        await alerts.raise(ctx, { ruleType: "vet_appointment", severity: t.dueDate < today ? "warning" : "info", title: `Vet appointment ${t.dueDate < today ? "missed?" : "coming up"}: ${t.title}`, message: `${t.title} on ${t.dueDate}.`, dedupKey: key, date: today, ...t.flockId ? { flockId: t.flockId } : {} }, tx);
      }
      await resolveMissing(ctx, "vet_appointment", keep, tx);
      return keep.size;
    },
    async hatch_date(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = /* @__PURE__ */ new Set();
      for (const b of await repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] }, range: { field: "expectedHatchDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `hatch_due:${b.id}`;
        keep.add(key);
        const when = b.expectedHatchDate < today ? "overdue" : b.expectedHatchDate === today ? "due today" : `due ${b.expectedHatchDate}`;
        await alerts.raise(ctx, { ruleType: "hatch_due", severity: b.expectedHatchDate < today ? "warning" : "info", title: `Hatch ${when}: batch ${b.code}`, message: `Batch ${b.code} (${b.eggsSet} eggs set on ${b.setDate}) is expected to hatch on ${b.expectedHatchDate}.`, dedupKey: key, date: today }, tx);
      }
      await resolveMissing(ctx, "hatch_due", keep, tx);
      return keep.size;
    },
    async order_delivery(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = /* @__PURE__ */ new Set();
      for (const o of await repos.orders.find(ctx.farmId, { where: { status: ["pending", "accepted", "preparing", "dispatched"] }, range: { field: "requestedDeliveryDate", to: addDays(today, rule.params["daysAhead"] ?? 1) } }, tx)) {
        const key = `order_delivery:${o.id}`;
        keep.add(key);
        const late = o.requestedDeliveryDate < today;
        await alerts.raise(ctx, { ruleType: "order_delivery", severity: late ? "warning" : "info", title: `Order ${o.orderNumber} delivery ${late ? "overdue" : "due"}`, message: `Order ${o.orderNumber} (${o.lines[0]?.quantity} ${o.lines[0]?.unit} ${o.lines[0]?.description ?? ""}) is ${o.status} and due for delivery on ${o.requestedDeliveryDate}.`, dedupKey: key, date: today }, tx);
      }
      await resolveMissing(ctx, "order_delivery", keep, tx);
      return keep.size;
    },
    async payment_overdue(ctx, farm, rule, tx) {
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const cutoff = addDays(today, -(rule.params["graceDays"] ?? 0) - 1);
      const keep = /* @__PURE__ */ new Set();
      const open = { where: { status: ["unpaid", "partially_paid"] } };
      const docs = [
        ...(await repos.incomes.find(ctx.farmId, open, tx)).map((x) => ({ ...x, side: "receivable", who: x.customerName })),
        ...rule.params["includePayables"] === 0 ? [] : (await repos.expenses.find(ctx.farmId, open, tx)).map((x) => ({ ...x, side: "payable", who: x.vendor }))
      ];
      for (const doc of docs) {
        if (!doc.dueDate) continue;
        const due = doc.dueDate;
        if (due > cutoff) continue;
        const key = `payment_overdue:${doc.id}`;
        keep.add(key);
        const owed = doc.amount.amountMinor - doc.amountPaid.amountMinor;
        await alerts.raise(ctx, { ruleType: "payment_overdue", severity: "warning", title: doc.side === "receivable" ? `Payment overdue from ${doc.who ?? "a customer"}` : `Bill overdue: ${doc.description}`, message: `${doc.description}: ${owed / 100} ${doc.amount.currency} ${doc.side === "receivable" ? "still owed to the farm" : "still owed by the farm"}, due ${due}.`, dedupKey: key, date: today, values: { outstandingMinor: owed } }, tx);
      }
      await resolveMissing(ctx, "payment_overdue", keep, tx);
      return keep.size;
    },
    async weather_risk(ctx, farm, rule, tx) {
      if (!farm.location) return 0;
      let w;
      try {
        w = await d.weather.forFarm(ctx);
      } catch {
        return 0;
      }
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const keep = /* @__PURE__ */ new Set();
      for (const r of w.risks) {
        const key = `weather:${r.date}:${r.kind}`;
        keep.add(key);
        await alerts.raise(ctx, { ruleType: "weather_risk", severity: r.kind === "heat" || r.kind === "cold" ? "warning" : "info", title: `Weather: ${r.kind} on ${r.date}`, message: `Forecast for ${r.date}: ${r.reason}. Plan ventilation, water and feeding times accordingly.`, dedupKey: key, date: today, values: { value: r.value } }, tx);
      }
      void rule;
      await resolveMissing(ctx, "weather_risk", keep, tx);
      return keep.size;
    }
  };
  return {
    flockDays,
    judgeDay,
    /** Evaluate every enabled rule for the farm. One failing rule does not stop the others. */
    async evaluate(ctx, tx) {
      const farm = await repos.farms.findById(ctx.farmId, tx);
      if (!farm) return {};
      const out = {};
      for (const [key, fn] of Object.entries(evaluators)) {
        if (!fn) continue;
        const rule = await d.rules.config(ctx, key, tx);
        if (!rule.enabled) {
          out[key] = "off";
          continue;
        }
        try {
          out[key] = await fn(ctx, farm, rule, tx);
        } catch (e) {
          out[key] = `error: ${e.message}`;
        }
      }
      return out;
    }
  };
}

// src/services/dashboard.service.ts
var LAYING3 = /* @__PURE__ */ new Set(["layer", "breeder", "custom"]);
var SEVERITIES = ["critical", "warning", "info"];
function createDashboardService(d) {
  const { repos, clock } = d;
  const safe = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      return { unavailable: e.message };
    }
  };
  return {
    /**
     * GET /dashboard. Sections the person may see: production today, alerts, weather, the coming week, stock,
     * hatchery, money. Each is computed from source records (nothing is cached on the client).
     */
    async overview(ctx) {
      assertCan(ctx, "farm.read");
      const farm = await repos.farms.findById(ctx.farmId);
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const openAlerts = await repos.alerts.find(ctx.farmId, { where: { status: ["open", "acknowledged"] }, sort: [{ field: "updatedAt", dir: -1 }] });
      const out = { date: today, farm: { id: farm.id, name: farm.name, currency: farm.settings.currency } };
      out["alerts"] = {
        open: openAlerts.length,
        bySeverity: Object.fromEntries(SEVERITIES.map((s2) => [s2, openAlerts.filter((a) => a.severity === s2).length])),
        latest: openAlerts.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5).map((a) => ({ id: a.id, ruleType: a.ruleType, severity: a.severity, status: a.status, title: a.title, flockId: a.flockId ?? null, date: a.date }))
      };
      if (can(ctx.role, "production.read")) {
        out["production"] = await safe(async () => {
          const day = await d.dailyRecords.dashboardDay(ctx, {});
          const weighings = await repos.flockEvents.find(ctx.farmId, { where: { flockId: day.flocks.map((f) => f.flockId), type: "weighing" }, sort: [{ field: "date", dir: -1 }] });
          const reversed = new Set(weighings.filter((w) => w.reversalOf).map((w) => w.reversalOf));
          const lastWeighed = /* @__PURE__ */ new Map();
          for (const w of weighings) if (!w.reversalOf && !reversed.has(w.id) && !lastWeighed.has(w.flockId)) lastWeighed.set(w.flockId, w.date);
          const weighed = day.flocks.filter((f) => f.latestAverageWeightG && f.birdsAlive > 0);
          const weighedBirds = weighed.reduce((t, f) => t + f.birdsAlive, 0);
          const averageWeightG = weighedBirds ? Math.round(weighed.reduce((t, f) => t + f.latestAverageWeightG * f.birdsAlive, 0) / weighedBirds) : null;
          const latestWeighingDate = [...lastWeighed.values()].sort().at(-1) ?? null;
          return {
            totals: { ...day.totals, averageWeightG, latestWeighingDate },
            flocksTotal: day.flocksTotal,
            flocksRecorded: day.flocksRecorded,
            flocks: day.flocks.map((f) => ({
              flockId: f.flockId,
              flockCode: f.flockCode,
              type: f.type,
              houseId: f.houseId,
              birdsAlive: f.birdsAlive,
              mortality: f.mortality,
              culls: f.culls,
              feedKg: f.feedKg,
              waterLitres: f.waterLitres,
              eggsCollected: f.eggsCollected,
              eggsBroken: f.eggsBroken,
              averageWeightG: f.latestAverageWeightG,
              latestWeighingDate: lastWeighed.get(f.flockId) ?? null,
              recorded: f.recorded
            }))
          };
        });
      }
      out["weather"] = farm.location ? await safe(async () => {
        const w = await d.weather.forFarm(ctx, { historyDays: 7 });
        return { current: w.current, today: w.forecast[0] ?? null, next: w.forecast.slice(1, 3), risks: w.risks, stale: w.stale, fetchedAt: w.fetchedAt };
      }) : { unavailable: "Set the farm's location to see weather" };
      out["upcoming"] = await safe(async () => (await d.calendar.events(ctx, { from: today, to: addDays(today, 7) })).events.slice(0, 10));
      if (can(ctx.role, "inventory.read")) {
        out["inventory"] = await safe(async () => {
          const [o, f] = await Promise.all([d.inventory.overview(ctx), d.feed.stock(ctx)]);
          return {
            totalValueMinor: o.totalValueMinor,
            lowStockItems: Object.values(o.categories).reduce((t, c) => t + c.lowStock, 0),
            lotsExpiringSoon: Object.values(o.categories).reduce((t, c) => t + c.lotsExpiringSoon, 0),
            feedDaysRemaining: f.totals.daysRemaining,
            eggsInStock: o.eggs.total,
            chicksAvailable: o.chicks.available
          };
        });
      }
      if (can(ctx.role, "hatchery.read")) {
        out["hatchery"] = await safe(async () => {
          const batches = await repos.hatcheryBatches.find(ctx.farmId, { where: { status: ["incubating", "in_hatcher"] }, sort: [{ field: "expectedHatchDate", dir: 1 }] });
          return { incubating: batches.length, eggsIncubating: batches.reduce((t, b) => t + (b.results?.inIncubation ?? b.eggsSet), 0), nextHatch: batches[0] ? { batchId: batches[0].id, code: batches[0].code, date: batches[0].expectedHatchDate } : null };
        });
      }
      if (can(ctx.role, "task.read")) out["tasks"] = await safe(() => d.tasks.summary(ctx));
      if (can(ctx.role, "money.read")) {
        out["finance"] = await safe(async () => {
          const monthStart = `${today.slice(0, 8)}01`;
          const [accounts, recv, pay, pnl] = await Promise.all([d.finance.listAccounts(ctx), d.finance.openItems(ctx, "income"), d.finance.openItems(ctx, "expense"), d.finance.profitAndLoss(ctx, { from: monthStart, to: today })]);
          return { cashMinor: accounts.reduce((t, a) => t + a.balanceMinor, 0), receivablesMinor: recv.totalOutstandingMinor, payablesMinor: pay.totalOutstandingMinor, monthToDate: { revenueMinor: pnl.revenue.totalMinor, expensesMinor: pnl.expenses.totalMinor, profitMinor: pnl.netProfitMinor } };
        });
      }
      return out;
    },
    /**
     * GET /analytics. Daily series (mortality %, hen-day %, feed and water per bird) for the chosen flocks, each day with
     * a baseline band from the preceding days and an anomaly flag using the farm's own rule parameters; flocks compared
     * with the farm's past flocks of the same type; alert counts for the period.
     */
    async analytics(ctx, q8) {
      assertCan(ctx, "production.read");
      if (q8.from > q8.to) throw new AppError("VALIDATION_FAILED", "from must be on or before to");
      if (dateRange(q8.from, q8.to).length > 366) throw new AppError("VALIDATION_FAILED", "Ask for at most 366 days at a time");
      const all = q8.flockId ? [await d.flocks.ledger.loadFlock(ctx, q8.flockId)] : await repos.flocks.find(ctx.farmId, { where: { status: ["active", "closed"] } });
      const flocks = all.filter((f) => (!q8.type || f.type === q8.type) && f.placementDate && f.placementDate <= q8.to && (f.status === "active" || (f.closedDate ?? "9999") >= q8.from));
      const rules = {
        mortality: await d.rules.config(ctx, "mortality"),
        egg_production: await d.rules.config(ctx, "egg_production"),
        feed_consumption: await d.rules.config(ctx, "feed_consumption"),
        water_consumption: await d.rules.config(ctx, "water_consumption")
      };
      const maxWindow = Math.max(...Object.values(rules).map((r) => r.params["windowDays"] ?? 7));
      const perFlock = await Promise.all(flocks.map(async (f) => ({ f, days: await d.intelligence.flockDays(ctx, f, addDays(q8.from, -maxWindow), q8.to) })));
      const allDates = dateRange(addDays(q8.from, -maxWindow), q8.to);
      const totals = allDates.map((date) => {
        let alive = 0, layingAlive = 0, deaths = 0, deathsKnown = false, eggs = 0, eggsKnown = false, feed = 0, feedAlive = 0, water = 0, waterAlive = 0;
        for (const { f, days } of perFlock) {
          const x = days.find((y) => y.date === date);
          if (!x) continue;
          alive += x.aliveStart;
          if (x.deaths !== null) {
            deaths += x.deaths;
            deathsKnown = true;
          }
          if (LAYING3.has(f.type) && x.henDayPercent !== null) {
            layingAlive += x.aliveStart;
            eggs += x.henDayPercent * x.aliveStart / 100;
            eggsKnown = true;
          }
          if (x.feedGPerBird !== null) {
            feed += x.feedGPerBird * x.aliveStart;
            feedAlive += x.aliveStart;
          }
          if (x.waterMlPerBird !== null) {
            water += x.waterMlPerBird * x.aliveStart;
            waterAlive += x.aliveStart;
          }
        }
        return {
          date,
          mortality: deathsKnown && alive > 0 ? deaths / alive * 100 : null,
          egg_production: eggsKnown && layingAlive > 0 ? eggs / layingAlive * 100 : null,
          feed_consumption: feedAlive > 0 ? feed / feedAlive : null,
          water_consumption: waterAlive > 0 ? water / waterAlive : null
        };
      });
      const series = Object.keys(rules).map((metric) => {
        const rule = rules[metric];
        const test = metric === "mortality" ? { direction: "above", deviationPercent: rule.params["deviationPercent"] ?? 50 } : metric === "egg_production" ? { direction: "below", deviationPercent: rule.params["dropPercent"] ?? 10 } : { direction: "both", deviationPercent: rule.params["deviationPercent"] ?? 20 };
        const points = totals.filter((t) => t.date >= q8.from).map((t) => {
          const prior = totals.filter((x) => x.date < t.date && x.date >= addDays(t.date, -(rule.params["windowDays"] ?? 7))).map((x) => x[metric]).filter((v2) => v2 !== null);
          const b = baselineOf(prior, rule.params["minBaselineDays"] ?? 3);
          const v = t[metric];
          const r3 = (n) => Math.round(n * 1e3) / 1e3;
          return { date: t.date, value: v === null ? null : r3(v), baselineMean: b ? r3(b.mean) : null, baselineLow: b ? r3(b.mean - b.sd) : null, baselineHigh: b ? r3(b.mean + b.sd) : null, anomaly: v !== null && b !== null && deviationFrom(v, b, test).triggered };
        });
        return { metric, unit: metric === "mortality" ? "% of birds per day" : metric === "egg_production" ? "% hen-day" : metric === "feed_consumption" ? "g per bird per day" : "ml per bird per day", ruleEnabled: rule.enabled, windowDays: rule.params["windowDays"] ?? 7, points, anomalies: points.filter((p6) => p6.anomaly).length };
      });
      const closed = (await repos.flocks.find(ctx.farmId, { where: { status: "closed" }, sort: [{ field: "closedDate", dir: -1 }] })).slice(0, 20);
      const past = /* @__PURE__ */ new Map();
      for (const f of closed) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        const e = past.get(f.type) ?? { fcr: [], mortality: [] };
        if (m.fcr !== null && m.fcrWarning !== "implausibly_low") e.fcr.push(m.fcr);
        if (m.mortalityRate !== null) e.mortality.push(m.mortalityRate);
        past.set(f.type, e);
      }
      const comparison = [];
      for (const { f, days } of perFlock) {
        const m = await d.flocks.metrics(ctx, f.id, {});
        const p6 = past.get(f.type);
        const fcrBase = baselineOf(p6?.fcr ?? [], 1);
        const mortBase = baselineOf(p6?.mortality ?? [], 1);
        const hd = days.filter((x) => x.date >= q8.from && x.henDayPercent !== null).map((x) => x.henDayPercent);
        comparison.push({
          flockId: f.id,
          flockCode: f.flockCode,
          type: f.type,
          status: f.status,
          ageDays: m.ageDays,
          mortalityRate: m.mortalityRate,
          farmPastMortalityRate: mortBase?.mean ?? null,
          fcr: m.fcr,
          farmPastFcr: fcrBase?.mean ?? null,
          pastFlocks: fcrBase?.n ?? mortBase?.n ?? 0,
          dailyWeightGainG: m.dailyWeightGainG,
          averageHenDayPercent: hd.length ? hd.reduce((t, v) => t + v, 0) / hd.length : null
        });
      }
      const alertRows = await repos.alerts.find(ctx.farmId, { range: { field: "date", from: q8.from, to: q8.to } });
      const alertCounts = {};
      for (const a of alertRows) alertCounts[a.ruleType] = (alertCounts[a.ruleType] ?? 0) + 1;
      return { from: q8.from, to: q8.to, flocks: flocks.map((f) => ({ id: f.id, flockCode: f.flockCode, type: f.type })), series, comparison, alerts: { total: alertRows.length, byType: alertCounts } };
    }
  };
}

// src/services/audit.service.ts
function createAuditService(repos, clock) {
  return {
    async record(ctx, input, tx) {
      const changes = input.before || input.after ? shallowDiff(input.before, input.after) : void 0;
      const rec = {
        id: newId(),
        farmId: input.farmId ?? ctx.farmId,
        actorUserId: ctx.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ...changes && Object.keys(changes).length ? { changes } : {},
        ...ctx.requestId ? { requestId: ctx.requestId } : {},
        ...ctx.mutationId ? { mutationId: ctx.mutationId } : {},
        ...ctx.deviceId ? { deviceId: ctx.deviceId } : {},
        at: clock.now()
      };
      await repos.audit.insert(rec, tx);
    },
    async list(farmId, opts) {
      const items = await repos.audit.list(farmId, { limit: opts.limit + 1, ...opts.cursor ? { beforeId: opts.cursor } : {} });
      const page = items.slice(0, opts.limit);
      return {
        items: page.map((a) => ({ ...a, at: a.at.toISOString() })),
        nextCursor: items.length > opts.limit ? page[page.length - 1].id : null
      };
    }
  };
}

// src/services/views.ts
var toUserView = (u) => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  ...u.phone ? { phone: u.phone } : {},
  platformRoles: u.platformRoles ?? [],
  emailVerified: u.emailVerified,
  hasPassword: !!u.passwordHash,
  googleLinked: !!u.googleSub,
  createdAt: u.createdAt.toISOString()
});
var toFarmView = (f, role) => ({
  id: f.id,
  name: f.name,
  ...f.description ? { description: f.description } : {},
  ...f.countryCode ? { countryCode: f.countryCode } : {},
  ...f.locationLabel ? { locationLabel: f.locationLabel } : {},
  ...f.location ? { location: f.location } : {},
  settings: f.settings,
  version: f.version,
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
  ...role ? { myRole: role, myPermissions: permissionsFor(role) } : {}
});
var toMembershipView = (m, user) => ({
  id: m.id,
  farmId: m.farmId,
  ...m.userId ? { userId: m.userId } : {},
  email: m.email,
  ...user?.fullName ? { fullName: user.fullName } : {},
  role: m.role,
  status: m.status,
  ...m.invitedAt ? { invitedAt: m.invitedAt.toISOString() } : {},
  ...m.joinedAt ? { joinedAt: m.joinedAt.toISOString() } : {},
  createdAt: m.createdAt.toISOString()
});
var toSessionView = (x, currentId) => ({
  id: x.id,
  ...x.deviceName ? { deviceName: x.deviceName } : {},
  platform: x.platform,
  ...x.userAgent ? { userAgent: x.userAgent } : {},
  ...x.ipAddress ? { ipAddress: x.ipAddress } : {},
  createdAt: x.createdAt.toISOString(),
  lastUsedAt: x.lastUsedAt.toISOString(),
  expiresAt: x.expiresAt.toISOString(),
  current: x.id === currentId
});

// src/services/auth.service.ts
var DAY = 864e5;
var VERIFY_TTL_MS = 24 * 60 * 60 * 1e3;
var RESET_TTL_MS = 60 * 60 * 1e3;
function createAuthService(d) {
  const { repos, clock } = d;
  let dummyHash;
  const getDummy = () => dummyHash ??= d.hasher.hash(randomToken());
  const ctxOf5 = (userId, meta, sessionId) => ({
    userId,
    ...sessionId ? { sessionId } : {},
    ...meta.requestId ? { requestId: meta.requestId } : {},
    ...meta.device?.deviceId ? { deviceId: meta.device.deviceId } : {}
  });
  async function issueRefreshToken(session, tx) {
    const now = clock.now();
    const secret = randomToken(32);
    const expiresAt = new Date(Math.min(now.getTime() + d.refreshTtlDays * DAY, session.expiresAt.getTime()));
    const id = newId();
    await repos.refreshTokens.create({ id, sessionId: session.id, userId: session.userId, tokenHash: sha256(secret), expiresAt, createdAt: now }, tx);
    return { id, secret, expiresAt };
  }
  async function tokenPair(session, tx) {
    const access = await d.accessTokens.sign(session.userId, session.id, clock.now());
    const refresh = await issueRefreshToken(session, tx);
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.secret,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      sessionId: session.id,
      _refreshId: refresh.id
    };
  }
  const publicPair = ({ _refreshId: _, ...pair }) => pair;
  async function startSession(user, method, meta, tx) {
    const now = clock.now();
    const session = {
      id: newId(),
      userId: user.id,
      platform: meta.device?.platform ?? "other",
      ...meta.device?.deviceId ? { deviceId: meta.device.deviceId } : {},
      ...meta.device?.name ? { deviceName: meta.device.name } : {},
      ...meta.userAgent ? { userAgent: meta.userAgent.slice(0, 300) } : {},
      ...meta.ip ? { ipAddress: meta.ip } : {},
      authMethod: method,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + d.sessionMaxDays * DAY)
    };
    await repos.sessions.create(session, tx);
    await d.audit.record(ctxOf5(user.id, meta, session.id), { action: "session.created", entity: "session", entityId: session.id, after: { platform: session.platform, authMethod: method } }, tx ?? {});
    return publicPair(await tokenPair(session, tx));
  }
  async function authenticateAccess(token) {
    const claims = await d.accessTokens.verify(token);
    const session = await repos.sessions.findById(claims.sid);
    const now = clock.now();
    if (!session || session.userId !== claims.sub) throw new AppError("UNAUTHENTICATED", "Invalid session");
    if (session.revokedAt) throw new AppError("SESSION_REVOKED", "This session has been signed out. Please sign in again.");
    if (session.expiresAt <= now) throw new AppError("TOKEN_EXPIRED", "Session expired. Please sign in again.");
    const user = await repos.users.findById(claims.sub);
    if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
    if (user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
    return { userId: user.id, sessionId: session.id };
  }
  async function createOneTimeToken(user, purpose, ttlMs, tx) {
    const token = randomToken();
    const now = clock.now();
    await repos.oneTimeTokens.create(
      { id: newId(), userId: user.id, purpose, tokenHash: sha256(token), email: user.email, expiresAt: new Date(now.getTime() + ttlMs), createdAt: now },
      tx
    );
    return token;
  }
  async function consumeOneTimeToken(token, purpose) {
    const rec = await repos.oneTimeTokens.findByHash(sha256(token));
    const now = clock.now();
    const invalid = new AppError("TOKEN_INVALID", purpose === "password_reset" ? "This reset link is invalid or has expired. Request a new one." : "This verification link is invalid or has expired. Request a new one.");
    if (!rec || rec.purpose !== purpose || rec.usedAt || rec.expiresAt <= now) throw invalid;
    const user = await repos.users.findById(rec.userId);
    if (!user || user.status !== "active") throw invalid;
    return { rec, user };
  }
  async function sendVerificationEmail(user, token) {
    await d.email.send({
      to: user.email,
      kind: "email_verification",
      subject: "Confirm your email for PoultryPilot",
      text: `Confirm your email address within 24 hours: ${d.appBaseUrl}/verify-email?token=${token}`,
      token
    });
  }
  async function createFarmWithOwner(user, farm, ctx, tx) {
    const now = clock.now();
    const farmRec = {
      id: newId(),
      name: farm.name,
      ...farm.countryCode ? { countryCode: farm.countryCode } : {},
      settings: { timezone: farm.timezone, currency: farm.currency, unitSystem: farm.unitSystem, fcrIncludesMortalityWeight: false, workerEditWindowDays: 1 },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    const membership = {
      id: newId(),
      farmId: farmRec.id,
      userId: user.id,
      email: user.email,
      role: "owner",
      status: "active",
      joinedAt: now,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    await repos.farms.create(farmRec, tx);
    await repos.memberships.create(membership, tx);
    await d.audit.record(ctx, { farmId: farmRec.id, action: "farm.created", entity: "farm", entityId: farmRec.id, after: { name: farmRec.name, settings: farmRec.settings } }, tx);
    await d.sync.recordChange(farmRec.id, { entity: "farm", entityId: farmRec.id, op: "upsert", version: 0, document: toFarmView(farmRec) }, tx);
    return farmRec;
  }
  async function activeUser(userId) {
    const user = await repos.users.findById(userId);
    if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
    if (user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
    return user;
  }
  return {
    authenticateAccess,
    createFarmWithOwner,
    async register(input, meta) {
      const email = input.email.toLowerCase();
      if (await repos.users.findByEmail(email)) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
      const passwordHash = await d.hasher.hash(input.password);
      const out = await repos.tx.run(async (tx) => {
        const now = clock.now();
        const user = {
          id: newId(),
          email,
          fullName: input.fullName,
          passwordHash,
          emailVerified: false,
          status: "active",
          passwordChangedAt: now,
          lastLoginAt: now,
          failedLoginCount: 0,
          createdAt: now,
          updatedAt: now,
          version: 0
        };
        try {
          await repos.users.create(user, tx);
        } catch (e) {
          if (e.code === 11e3) throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
          throw e;
        }
        const ctx = ctxOf5(user.id, meta);
        await d.audit.record(ctx, { action: "user.registered", entity: "user", entityId: user.id }, tx);
        const farm = await createFarmWithOwner(user, input.farm, ctx, tx);
        const verifyToken = await createOneTimeToken(user, "email_verification", VERIFY_TTL_MS, tx);
        const tokens = await startSession(user, "password", meta, tx);
        return { user, farm, tokens, verifyToken };
      });
      await sendVerificationEmail(out.user, out.verifyToken);
      return { user: toUserView(out.user), farm: toFarmView(out.farm, "owner"), tokens: out.tokens };
    },
    async verifyEmail(token, meta) {
      const { rec, user } = await consumeOneTimeToken(token, "email_verification");
      if (rec.email !== user.email) throw new AppError("TOKEN_INVALID", "This link was sent to a different email address");
      const now = clock.now();
      return repos.tx.run(async (tx) => {
        const next = await repos.users.update(user.id, { emailVerified: true, emailVerifiedAt: now, updatedAt: now }, tx);
        await repos.oneTimeTokens.invalidateForUser(user.id, "email_verification", now, tx);
        await d.audit.record(ctxOf5(user.id, meta), { action: "user.email_verified", entity: "user", entityId: user.id }, tx);
        return toUserView(next);
      });
    },
    async resendVerification(userId) {
      const user = await activeUser(userId);
      if (user.emailVerified) return { sent: false };
      await repos.oneTimeTokens.invalidateForUser(user.id, "email_verification", clock.now());
      const token = await createOneTimeToken(user, "email_verification", VERIFY_TTL_MS);
      await sendVerificationEmail(user, token);
      return { sent: true };
    },
    async login(emailRaw, password, meta) {
      const now = clock.now();
      const user = await repos.users.findByEmail(emailRaw.toLowerCase());
      if (user?.lockedUntil && user.lockedUntil > now) {
        const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 6e4);
        throw new AppError("ACCOUNT_LOCKED", `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`, { retryAfterSeconds: minutes * 60 });
      }
      const ok = user?.passwordHash ? await d.hasher.verify(user.passwordHash, password) : (await d.hasher.verify(await getDummy(), password), false);
      if (!user || !ok) {
        if (user) {
          const failed = user.failedLoginCount + 1;
          const lock = failed >= d.maxFailedLogins;
          await repos.users.update(user.id, {
            failedLoginCount: lock ? 0 : failed,
            ...lock ? { lockedUntil: new Date(now.getTime() + d.lockMinutes * 6e4) } : {},
            updatedAt: now
          });
          if (lock) await d.audit.record(ctxOf5(user.id, meta), { action: "user.locked", entity: "user", entityId: user.id }, {});
        }
        throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect");
      }
      if (user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
      const updated = await repos.users.update(user.id, { failedLoginCount: 0, lockedUntil: void 0, lastLoginAt: now, updatedAt: now });
      return { user: toUserView(updated ?? user), tokens: await startSession(user, "password", meta) };
    },
    /**
     * Google sign-in. Account resolution:
     * 1. a user already linked to this Google account (by `sub`) signs in;
     * 2. otherwise, if Google says the email is verified and a user has that email, Google is linked to it;
     * 3. otherwise a new user is created (email verified by Google) with no farm — the client then creates one.
     * Unverified Google emails are never linked or used to create accounts.
     */
    async loginWithGoogle(idToken, meta) {
      if (!d.google) throw new AppError("NOT_IMPLEMENTED", "Google sign-in is not configured");
      const g = await d.google.verify(idToken).catch(() => {
        throw new AppError("INVALID_CREDENTIALS", "Google sign-in could not be verified");
      });
      const now = clock.now();
      let user = await repos.users.findByGoogleSub(g.sub);
      let created = false;
      if (!user) {
        if (!g.emailVerified) throw new AppError("INVALID_CREDENTIALS", "Your Google account email is not verified");
        const byEmail = await repos.users.findByEmail(g.email.toLowerCase());
        if (byEmail) {
          user = await repos.users.update(byEmail.id, { googleSub: g.sub, emailVerified: true, emailVerifiedAt: byEmail.emailVerifiedAt ?? now, updatedAt: now });
          await d.audit.record(ctxOf5(byEmail.id, meta), { action: "user.google_linked", entity: "user", entityId: byEmail.id }, {});
        } else {
          user = {
            id: newId(),
            email: g.email.toLowerCase(),
            fullName: g.name ?? g.email.split("@")[0],
            googleSub: g.sub,
            emailVerified: true,
            emailVerifiedAt: now,
            status: "active",
            failedLoginCount: 0,
            createdAt: now,
            updatedAt: now,
            version: 0
          };
          await repos.users.create(user);
          await d.audit.record(ctxOf5(user.id, meta), { action: "user.registered", entity: "user", entityId: user.id, after: { method: "google" } }, {});
          created = true;
        }
      }
      if (!user || user.status !== "active") throw new AppError("ACCOUNT_DISABLED", "This account has been disabled");
      await repos.users.update(user.id, { lastLoginAt: now, updatedAt: now });
      const farms = await repos.memberships.findActiveForUser(user.id);
      return { user: toUserView(user), tokens: await startSession(user, "google", meta), created, needsFarm: farms.length === 0 };
    },
    /**
     * Refresh-token rotation with reuse detection. Presenting a token that was already rotated means it was
     * copied, so the whole session is revoked and both the thief and the owner must sign in again.
     */
    async refresh(secret, meta) {
      const rec = await repos.refreshTokens.findByHash(sha256(secret));
      if (!rec) throw new AppError("UNAUTHENTICATED", "Refresh token not recognised");
      const now = clock.now();
      const session = await repos.sessions.findById(rec.sessionId);
      if (!session) throw new AppError("UNAUTHENTICATED", "Refresh token not recognised");
      if (rec.replacedById || rec.revokedAt) {
        await repos.sessions.revoke(session.id, now, "token_reuse");
        await d.audit.record(ctxOf5(session.userId, meta, session.id), { action: "session.token_reuse_detected", entity: "session", entityId: session.id }, {});
        throw new AppError("TOKEN_REUSED", "This session was signed out for security. Please sign in again.");
      }
      if (session.revokedAt) throw new AppError("SESSION_REVOKED", "This session has been signed out. Please sign in again.");
      if (rec.expiresAt <= now || session.expiresAt <= now) throw new AppError("TOKEN_EXPIRED", "Session expired. Please sign in again.");
      await activeUser(session.userId);
      return repos.tx.run(async (tx) => {
        const pair = await tokenPair(session, tx);
        await repos.refreshTokens.update(rec.id, { replacedById: pair._refreshId }, tx);
        await repos.sessions.touch(session.id, now, tx);
        return publicPair(pair);
      });
    },
    /** Ends one session, identified by refresh token or by the caller's access token. Unknown tokens are ignored. */
    async logout(opts, meta) {
      let sessionId = opts.principal?.sessionId;
      if (!sessionId && opts.refreshToken) sessionId = (await repos.refreshTokens.findByHash(sha256(opts.refreshToken)))?.sessionId;
      if (!opts.principal && !opts.refreshToken) throw new AppError("VALIDATION_FAILED", "Send the refresh token, or call with your access token");
      if (!sessionId) return;
      const session = await repos.sessions.findById(sessionId);
      if (!session || session.revokedAt) return;
      await repos.sessions.revoke(session.id, clock.now(), "logout");
      await d.audit.record(ctxOf5(session.userId, meta, session.id), { action: "session.logout", entity: "session", entityId: session.id }, {});
    },
    /** Always succeeds from the caller's point of view, so it cannot be used to discover accounts. */
    async forgotPassword(emailRaw) {
      const user = await repos.users.findByEmail(emailRaw.toLowerCase());
      if (!user || user.status !== "active") return;
      await repos.oneTimeTokens.invalidateForUser(user.id, "password_reset", clock.now());
      const token = await createOneTimeToken(user, "password_reset", RESET_TTL_MS);
      await d.email.send({
        to: user.email,
        kind: "password_reset",
        subject: "Reset your PoultryPilot password",
        text: `Use this link within 1 hour to choose a new password: ${d.appBaseUrl}/reset-password?token=${token}. If you did not ask for this, ignore this email.`,
        token
      });
    },
    /** Sets a new password from an emailed link. Signs out every session and unlocks the account. */
    async resetPassword(token, newPassword, meta) {
      const { rec, user } = await consumeOneTimeToken(token, "password_reset");
      const passwordHash = await d.hasher.hash(newPassword);
      const now = clock.now();
      await repos.tx.run(async (tx) => {
        await repos.users.update(
          user.id,
          {
            passwordHash,
            passwordChangedAt: now,
            failedLoginCount: 0,
            lockedUntil: void 0,
            // The link reached this inbox, which proves the address.
            ...rec.email === user.email && !user.emailVerified ? { emailVerified: true, emailVerifiedAt: now } : {},
            updatedAt: now
          },
          tx
        );
        await repos.oneTimeTokens.markUsed(rec.id, now, tx);
        await repos.oneTimeTokens.invalidateForUser(user.id, "password_reset", now, tx);
        await repos.sessions.revokeAllForUser(user.id, now, "password_reset", void 0, tx);
        await d.audit.record(ctxOf5(user.id, meta), { action: "user.password_reset", entity: "user", entityId: user.id }, tx);
      });
      await d.email.send({ to: user.email, kind: "password_changed", subject: "Your PoultryPilot password was reset", text: "Your password was reset and all devices were signed out. If this was not you, reset it again and contact support." });
    },
    /** Changes the password of a signed-in user. Keeps the current session; signs out every other one. */
    async changePassword(principal, currentPassword, newPassword, meta) {
      const user = await activeUser(principal.userId);
      if (!user.passwordHash) {
        throw new AppError("VALIDATION_FAILED", "This account signs in with Google and has no password. Use forgot password to set one.");
      }
      if (!await d.hasher.verify(user.passwordHash, currentPassword)) throw new AppError("CURRENT_PASSWORD_INCORRECT", "Your current password is incorrect");
      if (await d.hasher.verify(user.passwordHash, newPassword)) throw new AppError("SAME_PASSWORD", "Choose a password different from your current one");
      const passwordHash = await d.hasher.hash(newPassword);
      const now = clock.now();
      const count = await repos.tx.run(async (tx) => {
        await repos.users.update(user.id, { passwordHash, passwordChangedAt: now, updatedAt: now }, tx);
        const n = await repos.sessions.revokeAllForUser(user.id, now, "password_changed", principal.sessionId, tx);
        await repos.oneTimeTokens.invalidateForUser(user.id, "password_reset", now, tx);
        await d.audit.record(ctxOf5(user.id, meta, principal.sessionId), { action: "user.password_changed", entity: "user", entityId: user.id }, tx);
        return n;
      });
      await d.email.send({ to: user.email, kind: "password_changed", subject: "Your PoultryPilot password was changed", text: "Your password was changed and your other devices were signed out. If this was not you, reset your password now." });
      return { otherSessionsSignedOut: count };
    },
    async updateProfile(principal, r) {
      await activeUser(principal.userId);
      await repos.users.update(principal.userId, { fullName: r.fullName, phone: r.phone || void 0, updatedAt: clock.now() });
      return this.me(principal);
    },
    async me(principal) {
      const user = await activeUser(principal.userId);
      const memberships = await repos.memberships.findActiveForUser(user.id);
      const farms = await repos.farms.findByIds(memberships.map((m) => m.farmId));
      const nameOf = new Map(farms.map((f) => [f.id, f.name]));
      return {
        user: toUserView(user),
        sessionId: principal.sessionId,
        memberships: memberships.filter((m) => nameOf.has(m.farmId)).map((m) => ({ membershipId: m.id, farmId: m.farmId, farmName: nameOf.get(m.farmId), role: m.role, permissions: permissionsFor(m.role) }))
      };
    },
    async listSessions(principal) {
      const now = clock.now();
      const list = await repos.sessions.listForUser(principal.userId);
      return list.filter((x) => !x.revokedAt && x.expiresAt > now).sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime()).map((x) => toSessionView(x, principal.sessionId));
    },
    /** Signs out one device. Another user's session id is reported as not found. */
    async revokeSession(principal, sessionId, meta) {
      const session = await repos.sessions.findById(sessionId);
      if (!session || session.userId !== principal.userId || session.revokedAt) throw notFound("Session");
      await repos.sessions.revoke(session.id, clock.now(), "user_revoked");
      await d.audit.record(ctxOf5(principal.userId, meta, principal.sessionId), { action: "session.revoked", entity: "session", entityId: session.id }, {});
    },
    async revokeOtherSessions(principal, meta) {
      const revoked = await repos.sessions.revokeAllForUser(principal.userId, clock.now(), "user_revoked", principal.sessionId);
      await d.audit.record(ctxOf5(principal.userId, meta, principal.sessionId), { action: "session.revoked_others", entity: "user", entityId: principal.userId, after: { revoked } }, {});
      return { revoked };
    }
  };
}

// src/services/farm.service.ts
var INVITE_TTL_MS = 7 * 864e5;
function createFarmService(d) {
  const { repos, clock } = d;
  async function resolveContext(ctx, farmId) {
    const farm = await repos.farms.findById(farmId);
    const m = farm ? await repos.memberships.findActive(farmId, ctx.userId) : null;
    if (!farm || !m) throw notFound("Farm");
    return { ...ctx, farmId, role: m.role, membershipId: m.id };
  }
  async function findMember(farmId, memberId) {
    const m = await repos.memberships.findById(farmId, memberId);
    return m && m.status !== "revoked" ? m : null;
  }
  async function guardLastOwner(farmId, target, nextRole, tx) {
    if (target.role === "owner" && target.status === "active" && nextRole !== "owner") {
      if (await repos.memberships.countActiveOwners(farmId, tx) <= 1) {
        throw new AppError("LAST_OWNER", "A farm must keep at least one owner. Make someone else an owner first.");
      }
    }
  }
  async function memberChanged(ctx, m, tx) {
    await d.sync.recordChange(m.farmId, { entity: "membership", entityId: m.id, op: m.status === "revoked" ? "delete" : "upsert", version: m.version, document: toMembershipView(m) }, tx);
  }
  async function sendInvite(m, token, farmName) {
    await d.email.send({
      to: m.email,
      kind: "farm_invite",
      subject: `You're invited to ${farmName} on PoultryPilot`,
      text: `You have been invited to ${farmName} as ${m.role.replace("_", " ")}. Accept within 7 days: ${d.appBaseUrl}/invite?token=${token}`,
      token
    });
  }
  return {
    resolveContext,
    findMember,
    async listMine(userId) {
      const memberships = await repos.memberships.findActiveForUser(userId);
      const farms = await repos.farms.findByIds(memberships.map((m) => m.farmId));
      const roleOf = new Map(memberships.map((m) => [m.farmId, m.role]));
      return farms.map((f) => toFarmView(f, roleOf.get(f.id)));
    },
    async create(ctx, input) {
      const user = await repos.users.findById(ctx.userId);
      if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists");
      const farm = await repos.tx.run((tx) => d.auth.createFarmWithOwner(user, input, ctx, tx));
      return toFarmView(farm, "owner");
    },
    async get(ctx) {
      assertCan(ctx, "farm.read");
      const farm = await repos.farms.findById(ctx.farmId);
      if (!farm) throw notFound("Farm");
      return toFarmView(farm, ctx.role);
    },
    /** PUT semantics: the body is the complete editable state. Optional fields left out are cleared. */
    async replace(ctx, input) {
      assertCan(ctx, "farm.update_settings");
      return repos.tx.run(async (tx) => {
        const cur = await repos.farms.findById(ctx.farmId, tx);
        if (!cur) throw notFound("Farm");
        if (cur.version !== input.version) throw new VersionConflict(cur.version, toFarmView(cur, ctx.role));
        if (input.currency !== cur.settings.currency && await repos.ledgerProbe.hasEntries(ctx.farmId, tx)) {
          throw new AppError("INVALID_STATE_TRANSITION", "Currency cannot change after money has been recorded");
        }
        const patch = {
          name: input.name,
          description: input.description,
          countryCode: input.countryCode,
          locationLabel: input.locationLabel,
          location: input.location,
          settings: {
            timezone: input.timezone,
            currency: input.currency,
            unitSystem: input.unitSystem,
            fcrIncludesMortalityWeight: input.fcrIncludesMortalityWeight,
            workerEditWindowDays: input.workerEditWindowDays,
            ...input.visitorDowntimeHours !== void 0 ? { visitorDowntimeHours: input.visitorDowntimeHours } : {}
          },
          updatedAt: clock.now()
        };
        const next = await repos.farms.updateVersioned(ctx.farmId, input.version, patch, tx);
        if (!next) {
          const latest = await repos.farms.findById(ctx.farmId, tx);
          throw new VersionConflict(latest?.version ?? -1, latest ? toFarmView(latest, ctx.role) : null);
        }
        await d.audit.record(ctx, { action: "farm.updated", entity: "farm", entityId: cur.id, before: cur, after: next }, tx);
        await d.sync.recordChange(ctx.farmId, { entity: "farm", entityId: cur.id, op: "upsert", version: next.version, document: toFarmView(next) }, tx);
        return toFarmView(next, ctx.role);
      });
    },
    async listMembers(ctx) {
      assertCan(ctx, "member.read");
      const list = (await repos.memberships.findByFarm(ctx.farmId)).filter((m) => m.status !== "revoked");
      const users = await Promise.all(list.map((m) => m.userId ? repos.users.findById(m.userId) : Promise.resolve(null)));
      return list.map((m, i) => toMembershipView(m, users[i]));
    },
    /**
     * Adds a member by email and sends an invitation; they join when they accept.
     * Requires member.invite, a verified email on the inviter (stops invitation spam from throwaway
     * accounts), and a role strictly below the inviter's own (owners may invite owners).
     */
    async addMember(ctx, emailRaw, role) {
      assertCan(ctx, "member.invite");
      assertCanManage(ctx, role, "assign");
      const inviter = await repos.users.findById(ctx.userId);
      if (!inviter?.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED", "Confirm your email address before inviting people to the farm");
      const email = emailRaw.toLowerCase();
      const existing = await repos.memberships.findByFarmAndEmail(ctx.farmId, email);
      if (existing?.status === "active") throw new AppError("ALREADY_MEMBER", "This person is already a member of the farm");
      if (existing) assertCanManage(ctx, existing.role, "manage");
      const token = randomToken();
      const now = clock.now();
      const farm = await repos.farms.findById(ctx.farmId);
      const rec = await repos.tx.run(async (tx) => {
        const invite = { role, inviteTokenHash: sha256(token), inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS), invitedBy: ctx.userId, invitedAt: now, updatedAt: now };
        let m;
        if (existing) {
          m = await repos.memberships.update(ctx.farmId, existing.id, invite, tx);
        } else {
          m = { id: newId(), farmId: ctx.farmId, email, status: "invited", createdBy: ctx.userId, createdAt: now, version: 0, ...invite };
          await repos.memberships.create(m, tx);
        }
        await d.audit.record(ctx, { action: "member.invited", entity: "membership", entityId: m.id, after: { email, role } }, tx);
        await memberChanged(ctx, m, tx);
        return m;
      });
      await sendInvite(rec, token, farm?.name ?? "a farm");
      return toMembershipView(rec);
    },
    /** Accepting proves the invitee controls the email address, so it also marks the email verified. */
    async acceptInvite(ctx, token) {
      const m = await repos.memberships.findByInviteHash(sha256(token));
      const user = await repos.users.findById(ctx.userId);
      const now = clock.now();
      if (!m || !user || m.status !== "invited" || !m.inviteExpiresAt || m.inviteExpiresAt <= now) {
        throw new AppError("INVITE_INVALID", "This invitation is invalid or has expired. Ask the farm to send a new one.");
      }
      if (m.email !== user.email) throw new AppError("INVITE_INVALID", "This invitation was sent to a different email address");
      return repos.tx.run(async (tx) => {
        const next = await repos.memberships.update(m.farmId, m.id, { status: "active", userId: user.id, joinedAt: now, inviteTokenHash: void 0, inviteExpiresAt: void 0, updatedAt: now }, tx);
        if (!user.emailVerified) await repos.users.update(user.id, { emailVerified: true, emailVerifiedAt: now, updatedAt: now }, tx);
        await d.audit.record(ctx, { farmId: m.farmId, action: "member.joined", entity: "membership", entityId: m.id, after: { role: m.role } }, tx);
        await memberChanged({ ...ctx, farmId: m.farmId }, next, tx);
        return toMembershipView(next, user);
      });
    },
    /** Changes a member's role. You cannot change your own role, act on someone at or above your rank, or assign a rank at or above yours. */
    async updateMember(ctx, target, role) {
      assertCan(ctx, "member.change_role");
      if (target.id === ctx.membershipId) throw forbidden("You cannot change your own role. Ask another owner or admin.");
      assertCanManage(ctx, target.role, "manage");
      assertCanManage(ctx, role, "assign");
      return repos.tx.run(async (tx) => {
        const cur = await findMember(ctx.farmId, target.id);
        if (!cur) throw notFound("Member");
        await guardLastOwner(ctx.farmId, cur, role, tx);
        const next = await repos.memberships.update(ctx.farmId, cur.id, { role, updatedBy: ctx.userId, updatedAt: clock.now() }, tx);
        await d.audit.record(ctx, { action: "member.role_changed", entity: "membership", entityId: cur.id, before: { role: cur.role }, after: { role } }, tx);
        await memberChanged(ctx, next, tx);
        return toMembershipView(next);
      });
    },
    /**
     * Removes a member or cancels an invitation. Anyone may remove themselves (leave the farm), except the
     * last owner. Removing someone else needs member.remove and a higher rank than theirs.
     */
    async removeMember(ctx, target) {
      const leaving = target.id === ctx.membershipId;
      if (!leaving) {
        assertCan(ctx, "member.remove");
        assertCanManage(ctx, target.role, "manage");
      }
      await repos.tx.run(async (tx) => {
        const cur = await findMember(ctx.farmId, target.id);
        if (!cur) throw notFound("Member");
        await guardLastOwner(ctx.farmId, cur, null, tx);
        const now = clock.now();
        const next = await repos.memberships.update(ctx.farmId, cur.id, { status: "revoked", removedAt: now, removedBy: ctx.userId, inviteTokenHash: void 0, inviteExpiresAt: void 0, updatedAt: now }, tx);
        await d.audit.record(ctx, { action: leaving ? "member.left" : cur.status === "invited" ? "member.invite_cancelled" : "member.removed", entity: "membership", entityId: cur.id, before: { role: cur.role, email: cur.email } }, tx);
        await memberChanged(ctx, next, tx);
      });
    }
  };
}

// src/services/tokens.ts
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
function createAccessTokens(cfg) {
  const key = new TextEncoder().encode(cfg.secret);
  return {
    async sign(userId, sessionId, now) {
      const iat = Math.floor(now.getTime() / 1e3);
      const exp = iat + cfg.ttlSeconds;
      const token = await new SignJWT({ sid: sessionId }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(userId).setJti(newId()).setIssuer(cfg.issuer).setAudience("poultrypilot").setIssuedAt(iat).setExpirationTime(exp).sign(key);
      return { token, expiresAt: new Date(exp * 1e3) };
    },
    async verify(token, now) {
      try {
        const { payload } = await jwtVerify(token, key, {
          issuer: cfg.issuer,
          audience: "poultrypilot",
          algorithms: ["HS256"],
          ...now ? { currentDate: now } : {}
        });
        const sid = payload["sid"];
        if (!payload.sub || !payload.jti || typeof sid !== "string") throw new AppError("UNAUTHENTICATED", "Invalid access token");
        return { sub: payload.sub, sid, jti: payload.jti };
      } catch (e) {
        if (e instanceof joseErrors.JWTExpired) throw new AppError("TOKEN_EXPIRED", "Access token expired");
        if (e instanceof AppError) throw e;
        throw new AppError("UNAUTHENTICATED", "Invalid access token");
      }
    }
  };
}

// src/container.ts
function buildContainer(d) {
  const clock = d.clock ?? systemClock;
  const accessTokens = createAccessTokens({ secret: d.config.jwtSecret, issuer: d.config.jwtIssuer, ttlSeconds: d.config.accessTtlSeconds });
  const audit = createAuditService(d.repos, clock);
  const sync = createSyncService(d.repos, clock);
  const auth = createAuthService({
    repos: d.repos,
    clock,
    hasher: d.hasher,
    accessTokens,
    audit,
    sync,
    email: d.email,
    ...d.google ? { google: d.google } : {},
    refreshTtlDays: d.config.refreshTtlDays,
    sessionMaxDays: d.config.sessionMaxDays,
    maxFailedLogins: d.config.maxFailedLogins,
    lockMinutes: d.config.lockMinutes,
    appBaseUrl: d.config.appBaseUrl
  });
  const farms = createFarmService({ repos: d.repos, clock, audit, sync, email: d.email, auth, appBaseUrl: d.config.appBaseUrl });
  sync.register("farm.update", {
    action: "farm.update_settings",
    schema: ReplaceFarmRequest.omit({ version: true }),
    async run(ctx, payload, meta) {
      if (meta.baseVersion === void 0) throw new AppError("VALIDATION_FAILED", "baseVersion is required for farm.update");
      const out = await farms.replace(ctx, { ...payload, version: meta.baseVersion });
      return { entityId: out.id, version: out.version };
    }
  });
  const houses = createHouseService({ repos: d.repos, clock, audit, sync });
  const flocks = createFlockService({ repos: d.repos, clock, audit, sync });
  const finance = createFinanceService({ repos: d.repos, clock, audit, sync, flocks });
  flocks.hooks.afterSale.push(finance.onFlockSale);
  flocks.hooks.onSaleReversed.push(finance.onFlockSaleReversed);
  flocks.hooks.extraCostMinor.push(finance.flockExtraCostMinor);
  flocks.hooks.extraIncomeMinor.push(finance.flockExtraIncomeMinor);
  const alerts = createAlertService({ repos: d.repos, clock });
  const rules = createRulesService({ repos: d.repos, clock, audit });
  const notifications = createNotificationService({ repos: d.repos, clock, providers: d.notificationProviders ?? [] });
  alerts.hooks.ruleFor = rules.forAlertType;
  alerts.hooks.onRaised = async (...args) => {
    await notifications.onAlert(...args);
  };
  const weather = createWeatherService({
    repos: d.repos,
    clock,
    rules,
    provider: d.weatherProvider ?? { name: "none", fetch: async () => {
      throw new Error("no weather provider configured");
    } }
  });
  const inventory = createInventoryService({ repos: d.repos, clock, audit, sync, onStockChanged: (ctx, tx) => alerts.evaluateInventory(ctx, tx) });
  inventory.hooks.afterPurchase.push(finance.onInventoryPurchase);
  const feed = createFeedService({ repos: d.repos, clock, audit, sync, inventory, flocks });
  const flockHealth = createHealthService({ repos: d.repos, clock, audit, sync, flocks, inventory, alerts });
  flocks.hooks.beforeBirdsLeave.push(flockHealth.assertBirdsMayLeave);
  flocks.hooks.extraCostMinor.push(flockHealth.flockHealthCostMinor);
  flockHealth.hooks.onCost.push(finance.onHealthCost);
  const biosecurity = createBiosecurityService({ repos: d.repos, clock, audit, sync, inventory, alerts });
  const content = createContentService({ repos: d.repos, clock });
  const hatchery = createHatcheryService({ repos: d.repos, clock, audit, sync, inventory, alerts });
  const chickStart = createChickStartService({ repos: d.repos, clock, audit, flocks, biosecurity, alerts });
  const calendar = createCalendarService({ repos: d.repos, clock });
  const market = createMarketService({ repos: d.repos, clock, audit, sync, finance, flocks, inventory, hatchery, notifications });
  const dailyRecords = createDailyRecordService({
    repos: d.repos,
    clock,
    audit,
    sync,
    flocks,
    feed,
    alerts,
    afterEggsWritten: flockHealth.refreshWithheldEggs,
    waterRules: async (ctx, tx) => {
      const r = await rules.config(ctx, "water_consumption", tx);
      return { deviationPercent: r.params["deviationPercent"] ?? 20, minBaselineDays: r.params["minBaselineDays"] ?? 3, windowDays: r.params["windowDays"] ?? 7, ...r.params["phMin"] !== void 0 ? { phMin: r.params["phMin"] } : {}, ...r.params["phMax"] !== void 0 ? { phMax: r.params["phMax"] } : {}, ...r.params["tdsMaxPpm"] !== void 0 ? { tdsMaxPpm: r.params["tdsMaxPpm"] } : {} };
    }
  });
  const media = createMediaService({ repos: d.repos, clock, audit, storage: d.media ?? memoryMediaStorage() });
  const DailyRecordCommand = z30.object({ flockId: Id, date: LocalDate, record: UpsertDailyRecordRequest });
  const MortalityCommand = MortalityRequest.extend({ flockId: Id });
  const CullCommand = CullRequest.extend({ flockId: Id });
  sync.register("daily_record.put", {
    action: "production.record",
    schema: DailyRecordCommand,
    async run(ctx, raw, meta) {
      const p6 = raw;
      const out = await dailyRecords.upsertByFlockDate(ctx, p6.flockId, p6.date, { ...p6.record, ...meta.baseVersion !== void 0 ? { version: meta.baseVersion } : {} }, { minimal: true });
      return { entityId: out.id, version: out.version };
    }
  });
  sync.register("flock.mortality", {
    action: "production.record",
    schema: MortalityCommand,
    async run(ctx, raw) {
      const { flockId, ...r } = raw;
      return { entityId: (await flocks.recordMortality(ctx, flockId, r)).id };
    }
  });
  sync.register("flock.cull", {
    action: "production.record",
    schema: CullCommand,
    async run(ctx, raw) {
      const { flockId, ...r } = raw;
      return { entityId: (await flocks.recordCull(ctx, flockId, r)).id };
    }
  });
  sync.register("flock.weighing", {
    action: "production.record",
    schema: z30.object({ flockId: Id, weighing: WeighingRequest }),
    async run(ctx, p6) {
      return { entityId: (await flocks.weigh(ctx, p6.flockId, p6.weighing)).id };
    }
  });
  const intelligence = createIntelligenceService({ repos: d.repos, clock, alerts, rules, flocks, weather });
  const reports = createReportService({ repos: d.repos, clock, audit, flocks, finance, hatchery, inventory, feed });
  const tasks = createTaskService({ repos: d.repos, clock, audit, calendar, dailyRecords });
  const DayPatchCommand = z30.object({ flockId: Id, date: LocalDate, patch: PatchDailyRecordRequest.omit({ version: true }) });
  sync.register("daily_record.patch", {
    action: "production.record",
    schema: DayPatchCommand,
    async run(ctx, raw, meta) {
      const p6 = raw;
      try {
        const out = await dailyRecords.patchByFlockDate(ctx, p6.flockId, p6.date, { ...p6.patch, ...meta.baseVersion !== void 0 ? { version: meta.baseVersion } : {} });
        return { entityId: out.id, version: out.version };
      } catch (e) {
        if (e instanceof AppError && e.code === "VERSION_CONFLICT") {
          const server = await dailyRecords.getByFlockDate(ctx, p6.flockId, p6.date);
          throw new VersionConflict(server.version ?? 0, server);
        }
        throw e;
      }
    }
  });
  const TaskCommand = CompleteTaskRequest.extend({ taskId: Id });
  sync.register("task.complete", {
    action: "task.complete",
    schema: TaskCommand,
    async run(ctx, raw) {
      const { taskId, notes } = raw;
      try {
        const t = await tasks.complete(ctx, taskId, { ...notes ? { notes } : {} });
        return { entityId: t.id, version: t.version };
      } catch (e) {
        const t = e instanceof AppError && e.code === "INVALID_STATE_TRANSITION" ? await tasks.get(ctx, taskId) : null;
        if (t?.status === "done") return { entityId: t.id, version: t.version };
        throw e;
      }
    }
  });
  sync.register("task.start", {
    action: "task.complete",
    schema: z30.object({ taskId: Id }),
    async run(ctx, p6) {
      try {
        const t = await tasks.start(ctx, p6.taskId);
        return { entityId: t.id, version: t.version };
      } catch (e) {
        const t = e instanceof AppError && e.code === "INVALID_STATE_TRANSITION" ? await tasks.get(ctx, p6.taskId) : null;
        if (t && (t.status === "in_progress" || t.status === "done")) return { entityId: t.id, version: t.version };
        throw e;
      }
    }
  });
  sync.register("health.record", {
    action: "health.record_observation",
    schema: CreateHealthRecordRequest,
    async run(ctx, raw) {
      const input = raw;
      if (input.id && await d.repos.healthRecords.findById(ctx.farmId, input.id)) return { entityId: input.id };
      const r = await flockHealth.createRecord(ctx, input);
      return { entityId: r.id };
    }
  });
  const VaccinationCommand = z30.object({ vaccinationId: Id }).passthrough();
  sync.register("vaccination.administer", {
    action: "health.vaccinate",
    schema: VaccinationCommand,
    async run(ctx, raw) {
      const { vaccinationId, ...rest } = raw;
      const r = AdministerVaccinationRequest.parse(rest);
      const v = await d.repos.vaccinations.findById(ctx.farmId, vaccinationId);
      if (v?.status === "done") return { entityId: v.id, version: v.version };
      const out = await flockHealth.administer(ctx, vaccinationId, r);
      return { entityId: vaccinationId, version: out.version };
    }
  });
  const dashboard = createDashboardService({ repos: d.repos, clock, dailyRecords, weather, calendar, inventory, feed, hatchery, finance, flocks, intelligence, rules, tasks });
  const FeedCommand = FeedConsumptionRequest;
  sync.register("feed.consume", {
    action: "inventory.issue",
    schema: FeedCommand,
    async run(ctx, raw) {
      return { entityId: (await feed.consume(ctx, raw)).id };
    }
  });
  return { ...d, clock, startedAt: clock.now(), accessTokens, audit, sync, auth, farms, houses, flocks, dailyRecords, media, inventory, feed, alerts, flockHealth, biosecurity, content, hatchery, chickStart, calendar, finance, market, rules, notifications, weather, intelligence, dashboard, reports, tasks };
}

// src/db/mongo.ts
import mongoose2 from "mongoose";
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function createMongo(opts, logger) {
  const log = logger.child({ component: "mongodb" });
  const conn = mongoose2.connection;
  let stopping = false;
  mongoose2.set("strictQuery", true);
  conn.on("connected", () => log.info({ host: conn.host, db: conn.name }, "MongoDB connected"));
  conn.on("disconnected", () => !stopping && log.warn("MongoDB disconnected"));
  conn.on("reconnected", () => log.info("MongoDB reconnected"));
  conn.on("error", (err) => !stopping && log.error({ err: err.message }, "MongoDB connection error"));
  async function connect() {
    const target = redactMongoUri(opts.uri);
    for (let attempt = 0; ; attempt++) {
      try {
        log.info({ uri: target, attempt: attempt + 1 }, "connecting to MongoDB");
        await mongoose2.connect(opts.uri, {
          serverSelectionTimeoutMS: opts.serverSelectionTimeoutMS,
          maxPoolSize: opts.maxPoolSize,
          autoIndex: opts.autoIndex,
          appName: opts.appName ?? "poultrypilot-api"
        });
        return;
      } catch (err) {
        if (stopping) return;
        if (attempt >= opts.retries) {
          log.error({ err, attempts: attempt + 1 }, "giving up connecting to MongoDB");
          throw err;
        }
        const delay = Math.min(3e4, 500 * 2 ** attempt);
        log.warn({ err: err.message, retryInMs: delay }, "MongoDB connection failed; retrying");
        await sleep(delay);
      }
    }
  }
  const check = async (timeoutMs = 2e3) => {
    if (conn.readyState !== 1 || !conn.db) return { status: "down", error: `not connected (state ${conn.readyState})` };
    const started = performance.now();
    try {
      await Promise.race([
        conn.db.admin().command({ ping: 1 }),
        sleep(timeoutMs).then(() => {
          throw new Error(`ping timed out after ${timeoutMs} ms`);
        })
      ]);
      return { status: "up", latencyMs: Math.round(performance.now() - started) };
    } catch (err) {
      log.warn({ err }, "database ping failed");
      return { status: "down", error: "database did not answer" };
    }
  };
  async function disconnect() {
    stopping = true;
    if (conn.readyState !== 0) await mongoose2.disconnect();
    log.info("MongoDB connection closed");
  }
  return { connect, check, disconnect, connection: conn };
}

// src/lib/logger.ts
import { pino } from "pino";
function createLogger(opts) {
  return pino({
    level: opts.level,
    base: { service: opts.service ?? "poultrypilot-api", version: opts.version },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.newPassword",
        "*.refreshToken",
        "*.accessToken",
        "*.token",
        "*.idToken"
      ],
      censor: "[redacted]"
    },
    ...opts.format === "pretty" ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service,version" } } } : {}
  });
}

// src/server.ts
async function main() {
  const env = loadEnv();
  const logger = createLogger({ level: env.LOG_LEVEL, format: env.LOG_FORMAT, version: env.APP_VERSION });
  const mongo = createMongo(
    {
      uri: env.MONGODB_URI,
      serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
      retries: env.MONGODB_CONNECT_RETRIES,
      autoIndex: env.MONGODB_AUTO_INDEX ?? env.NODE_ENV !== "production"
    },
    logger
  );
  const mail = env.SMTP_URL ? smtpEmailSender({ url: env.SMTP_URL, from: env.EMAIL_FROM }) : logEmailSender(logger);
  const container = buildContainer({
    repos: createMongoRepositories(mongo.connection),
    health: { mongodb: mongo.check },
    logger,
    hasher: argon2Hasher,
    media: env.S3_BUCKET ? s3MediaStorage({ bucket: env.S3_BUCKET, region: env.S3_REGION, ...env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {} }) : localDiskMediaStorage(env.MEDIA_DIR),
    weatherProvider: openMeteoProvider(env.OPEN_METEO_API_KEY ? { apiKey: env.OPEN_METEO_API_KEY } : {}),
    notificationProviders: [
      emailNotificationProvider(mail),
      env.FCM_PROJECT_ID && env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY ? fcmPushProvider({ projectId: env.FCM_PROJECT_ID, clientEmail: env.FCM_CLIENT_EMAIL, privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n") }) : logPushProvider(logger)
    ],
    email: bestEffortEmail(mail, logger),
    ...env.GOOGLE_CLIENT_IDS.length ? { google: googleVerifier(env.GOOGLE_CLIENT_IDS) } : {},
    config: {
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      trustProxy: env.TRUST_PROXY,
      bodyLimit: env.REQUEST_BODY_LIMIT,
      rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
      authRateLimitPerMinute: env.AUTH_RATE_LIMIT_PER_MINUTE,
      openapiEnabled: env.OPENAPI_ENABLED ?? env.NODE_ENV !== "production",
      jwtSecret: env.JWT_ACCESS_SECRET,
      jwtIssuer: env.JWT_ISSUER,
      accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
      sessionMaxDays: env.SESSION_MAX_DAYS,
      maxFailedLogins: env.LOGIN_MAX_FAILED_ATTEMPTS,
      lockMinutes: env.LOGIN_LOCK_MINUTES,
      appBaseUrl: env.APP_BASE_URL,
      corsOrigins: env.CORS_ORIGINS
    }
  });
  const app = createApp(container);
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT, env: env.NODE_ENV }, "PoultryPilot API listening");
    if (env.NODE_ENV === "production" && !env.S3_BUCKET) logger.warn({ mediaDir: env.MEDIA_DIR }, "Photos are stored on local disk: use one instance with a persistent volume, or set S3_BUCKET");
  });
  server.keepAliveTimeout = 5e3;
  server.headersTimeout = 6e3;
  const stopAlertJob = scheduleAlertJob(container, logger);
  const stopDelivery = scheduleDelivery(container, logger);
  const stopNews = scheduleNewsImport(container, env.NEWS_FEEDS, logger);
  await container.content.seed().catch((err) => logger.error({ err }, "content seed failed"));
  let shuttingDown = false;
  const shutdown = async (reason, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, "shutting down");
    const force = setTimeout(() => {
      logger.error({ timeoutMs: env.SHUTDOWN_TIMEOUT_MS }, "shutdown timed out; forcing exit");
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    force.unref();
    stopAlertJob();
    stopDelivery();
    stopNews();
    const closed = new Promise((resolve3) => server.close(() => resolve3()));
    server.closeIdleConnections();
    await closed;
    await mongo.disconnect().catch((err) => logger.error({ err }, "error closing MongoDB"));
    logger.info("shutdown complete");
    process.exit(code);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (err) => {
    logger.fatal({ err }, "unhandled promise rejection");
    void shutdown("unhandledRejection", 1);
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    void shutdown("uncaughtException", 1);
  });
  try {
    await mongo.connect();
  } catch {
    await shutdown("mongodb-unavailable", 1);
  }
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
//# sourceMappingURL=server.js.map