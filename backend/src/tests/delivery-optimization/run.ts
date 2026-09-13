import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  DeliveryBatchModel,
  DeliveryPartnerModel,
  DeliveryRequestModel,
  DeliveryType,
  TailoringRequestModel,
  TailorModel,
  UserModel
} from "../../models.js";
import { optimizeDeliveryBatchForTesting } from "../../services/hybrid-delivery.service.js";
import { batchDeliveryPayout, pointFrom, roadDistanceMatrix, type LatLng } from "../../services/delivery-pricing.service.js";

type Args = {
  stops: number;
  orders: number;
  seed: number;
  batch: "STANDARD" | "EXPRESS" | "INSTANT";
  simulateOsrmFailure: boolean;
};

type TaskDoc = Awaited<ReturnType<typeof DeliveryRequestModel.findOne>> & Record<string, any>;
type Matrix = Array<Array<{ distance: number; duration: number }>>;

const DEFAULT_START: LatLng = { lat: 28.6212, lng: 77.0735 };
const TEST_AREA = "TEST ONLY - Janakpuri / Uttam Nagar synthetic grid";

function parseArgs(): Args {
  const flags = new Map<string, string | boolean>();
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    flags.set(key, value ?? true);
  }
  const stops = Math.max(2, Number(flags.get("stops") ?? 10) || 10);
  const orders = Math.max(1, Number(flags.get("orders") ?? Math.ceil(stops / 2)) || Math.ceil(stops / 2));
  const normalizedOrders = Math.ceil(stops / 2) !== orders && flags.has("orders") ? orders : Math.ceil(stops / 2);
  const seed = Number(flags.get("seed") ?? Date.now()) || Date.now();
  const batch = String(flags.get("batch") ?? "STANDARD").toUpperCase() as Args["batch"];
  return {
    stops: normalizedOrders * 2,
    orders: normalizedOrders,
    seed,
    batch: batch === "EXPRESS" || batch === "INSTANT" ? batch : "STANDARD",
    simulateOsrmFailure: flags.has("simulate-osrm-failure")
  };
}

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function testRunId(seed: number, suffix?: string) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 17);
  return `DARJI-ROUTE-TEST-${stamp}-${seed}${suffix ? `-${suffix}` : ""}`;
}

function syntheticPoint(index: number, random: () => number): LatLng {
  const clusters = [
    { lat: 28.6217, lng: 77.0715 },
    { lat: 28.6282, lng: 77.0558 },
    { lat: 28.6128, lng: 77.0346 },
    { lat: 28.6355, lng: 77.0968 }
  ];
  const cluster = clusters[index % clusters.length];
  const spread = index % 5 === 0 ? 0.010 : 0.0035;
  return {
    lat: Number((cluster.lat + (random() - 0.5) * spread).toFixed(6)),
    lng: Number((cluster.lng + (random() - 0.5) * spread).toFixed(6))
  };
}

function geo(point: LatLng): { type: "Point"; coordinates: number[]; lat: number; lng: number } {
  return { type: "Point", coordinates: [point.lng, point.lat], lat: point.lat, lng: point.lng };
}

async function createFakeData(args: Args, runId: string) {
  if (args.batch === "INSTANT") {
    throw new Error("INSTANT deliveries are not represented by DeliveryBatch.serviceLevel in the current schema, so batch optimization is NOT IMPLEMENTED for INSTANT.");
  }
  const batchLevel = args.batch as "STANDARD" | "EXPRESS";
  const random = rng(args.seed);
  const roundAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const lockAt = new Date(Date.now() - 60 * 1000);

  const riderUser = await UserModel.create({
    phone: `+91000${String(args.seed).slice(-5).padStart(5, "0")}`,
    name: "Test Rider 001",
    email: `rider-${runId.toLowerCase()}@example.test`,
    role: "DELIVERY_PARTNER"
  });
  const rider: any = await DeliveryPartnerModel.create({
    userId: riderUser.id,
    vehicleNumber: "TEST-VEHICLE",
    deliveryType: DeliveryType.PICKUP,
    assignedArea: TEST_AREA,
    isAvailable: false,
    verificationStatus: "VERIFIED",
    currentLocation: geo(DEFAULT_START)
  });

  const batch = await DeliveryBatchModel.create({
    batchId: `${runId}-BATCH`,
    deliveryPartnerId: rider.id,
    deliveryType: DeliveryType.PICKUP,
    serviceLevel: batchLevel,
    deliveryRound: "ONE_PM",
    roundAt,
    lockAt,
    shift: "morning",
    area: TEST_AREA,
    slotIndex: 1,
    tasks: [],
    ordersCount: args.orders,
    status: "scheduled",
    riderStartLocation: geo(DEFAULT_START)
  });

  const orders = [];
  const tasks = [];
  for (let index = 0; index < args.orders; index += 1) {
    const serial = String(index + 1).padStart(3, "0");
    const customerPoint = index === 0
      ? { lat: DEFAULT_START.lat + 0.0008, lng: DEFAULT_START.lng + 0.0008 }
      : syntheticPoint(index * 2, random);
    const tailorPoint = index === 0
      ? syntheticPoint(23, random)
      : syntheticPoint(index * 2 + 1, random);
    const customer = await UserModel.create({
      phone: `+9199900${String(args.seed % 1000).padStart(3, "0")}${serial}`,
      name: `Customer ${serial}`,
      email: `customer-${serial}-${runId.toLowerCase()}@example.test`,
      role: "CUSTOMER"
    });
    const tailorUser = await UserModel.create({
      phone: `+9188800${String(args.seed % 1000).padStart(3, "0")}${serial}`,
      name: `Tailor ${serial}`,
      email: `tailor-${serial}-${runId.toLowerCase()}@example.test`,
      role: "TAILOR"
    });
    const tailor = await TailorModel.create({
      userId: tailorUser.id,
      shopName: `Tailor ${serial}`,
      specialization: ["Alteration"],
      isAvailable: true,
      verificationStatus: "VERIFIED",
      verification: { shop: { location: geo(tailorPoint), address: `TEST TAILOR LOCATION ${serial}` } }
    });
    const order = await TailoringRequestModel.create({
      customerId: customer.id,
      assignedTailorId: tailor.id,
      description: `Test tailoring request ${serial}`,
      clothType: "Shirt",
      workType: "Alteration",
      urgency: args.batch.toLowerCase(),
      pickupAddress: `TEST CUSTOMER LOCATION ${serial}`,
      pickupLocation: geo(customerPoint),
      status: "TAILOR_SELECTED",
      orderStatus: "tailor_accepted",
      paymentStatus: "PAID",
      paymentMethod: "ONLINE",
      quoteAmount: 500,
      totalAmount: 550,
      serviceCategory: "Alteration"
    });
    const distanceMeters = Math.round(Math.hypot(customerPoint.lat - tailorPoint.lat, customerPoint.lng - tailorPoint.lng) * 111_000);
    const task = await DeliveryRequestModel.create({
      orderId: order.id,
      tailorId: tailor.id,
      customerId: customer.id,
      type: "customer_to_tailor",
      deliveryType: DeliveryType.PICKUP,
      serviceLevel: batchLevel,
      deliveryRound: "ONE_PM",
      roundAt,
      assignedArea: TEST_AREA,
      batchId: batch.batchId,
      taskStatus: "pending",
      shift: "morning",
      estimatedDistanceKm: Number((distanceMeters / 1000).toFixed(2)),
      distanceMeters,
      estimatedEarnings: batchDeliveryPayout(distanceMeters, 1),
      pickupAddress: `TEST CUSTOMER LOCATION ${serial}`,
      dropAddress: `TEST TAILOR LOCATION ${serial}`,
      pickupLocation: geo(customerPoint),
      dropLocation: geo(tailorPoint),
      customerName: `Customer ${serial}`,
      customerPhone: `TEST-CUSTOMER-${serial}`,
      tailorName: `Tailor ${serial}`,
      tailorPhone: `TEST-TAILOR-${serial}`,
      clothType: "Shirt",
      workType: "Alteration",
      paymentMethod: "ONLINE",
      paymentStatus: "PAID",
      totalAmount: 550
    });
    orders.push({ id: order.id, label: `TEST-ORDER-${serial}`, customer: customer.name, tailor: tailor.shopName, pickupStop: `${task.id}:PICKUP`, dropStop: `${task.id}:DROP` });
    tasks.push(task);
  }

  await DeliveryBatchModel.updateOne({ batchId: batch.batchId }, { $set: { tasks: tasks.map((task) => task.id), ordersCount: tasks.length, pickupCount: tasks.length, dropCount: tasks.length } });
  return { batchId: batch.batchId, rider, orders, tasks };
}

function taskPoint(task: any, kind: "pickup" | "drop") {
  const point = pointFrom(kind === "pickup" ? task.pickupLocation : task.dropLocation);
  if (!point) throw new Error(`Missing ${kind} point for task ${task.id}`);
  return point;
}

function pointsForTasks(tasks: any[], start = DEFAULT_START) {
  return [start, ...tasks.flatMap((task) => [taskPoint(task, "pickup"), taskPoint(task, "drop")])];
}

function taskNodeIndex(tasks: any[], task: any, kind: "pickup" | "drop") {
  const index = tasks.findIndex((candidate) => String(candidate.id) === String(task.id));
  return 1 + index * 2 + (kind === "drop" ? 1 : 0);
}

function routeDistance(order: any[], allTasks: any[], matrix: Matrix) {
  let distance = 0;
  let duration = 0;
  let cursor = 0;
  for (const task of order) {
    const pickup = taskNodeIndex(allTasks, task, "pickup");
    const drop = taskNodeIndex(allTasks, task, "drop");
    distance += Number(matrix[cursor]?.[pickup]?.distance ?? 0);
    duration += Number(matrix[cursor]?.[pickup]?.duration ?? 0);
    distance += Number(matrix[pickup]?.[drop]?.distance ?? 0);
    duration += Number(matrix[pickup]?.[drop]?.duration ?? 0);
    cursor = drop;
  }
  return { distance, duration };
}

function nearestNeighborOrder(tasks: any[], matrix: Matrix) {
  const remaining = [...tasks];
  const ordered = [];
  let cursor = 0;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((task, index) => {
      const pickup = taskNodeIndex(tasks, task, "pickup");
      const distance = Number(matrix[cursor]?.[pickup]?.distance ?? Number.POSITIVE_INFINITY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    cursor = taskNodeIndex(tasks, next, "drop");
  }
  return ordered;
}

function exactBestOrder(tasks: any[], matrix: Matrix, maxTasks = 5) {
  if (tasks.length > maxTasks) return undefined;
  let best: { order: any[]; distance: number; duration: number } | undefined;
  const visit = (prefix: any[], remaining: any[]) => {
    if (!remaining.length) {
      const totals = routeDistance(prefix, tasks, matrix);
      if (!best || totals.distance < best.distance) best = { order: [...prefix], ...totals };
      return;
    }
    for (let index = 0; index < remaining.length; index += 1) {
      const next = remaining[index];
      visit([...prefix, next], remaining.filter((_, candidate) => candidate !== index));
    }
  };
  visit([], tasks);
  return best;
}

async function rawOsrmMatrixStatus(points: LatLng[], simulateFailure: boolean) {
  if (simulateFailure) return { status: "FAIL", error: "Simulated OSRM failure requested by --simulate-osrm-failure" };
  const baseUrl = process.env.OSRM_URL ?? "https://router.project-osrm.org";
  try {
    const coords = points.map((point) => `${point.lng},${point.lat}`).join(";");
    const response = await fetch(`${baseUrl}/table/v1/driving/${coords}?annotations=distance,duration`);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const data = await response.json() as { distances?: unknown; durations?: unknown };
    if (!Array.isArray(data.distances) || !Array.isArray(data.durations)) throw new Error("Missing distances/durations arrays");
    return { status: "PASS", error: undefined };
  } catch (error) {
    return { status: "FAIL", error: error instanceof Error ? error.message : String(error) };
  }
}

function buildStops(actualOrder: any[], allTasks: any[], matrix: Matrix) {
  const stops = [];
  let cursor = 0;
  let cumulativeDistance = 0;
  let cumulativeDuration = 0;
  let sequence = 1;
  for (const task of actualOrder) {
    for (const kind of ["pickup", "drop"] as const) {
      const node = taskNodeIndex(allTasks, task, kind);
      const leg = matrix[cursor]?.[node] ?? { distance: 0, duration: 0 };
      cumulativeDistance += Number(leg.distance ?? 0);
      cumulativeDuration += Number(leg.duration ?? 0);
      stops.push({
        sequence,
        stopId: `${task.id}:${kind.toUpperCase()}`,
        taskId: task.id,
        orderId: task.orderId,
        type: kind.toUpperCase(),
        entity: kind === "pickup" ? task.customerName : task.tailorName,
        address: kind === "pickup" ? task.pickupAddress : task.dropAddress,
        latitude: taskPoint(task, kind).lat,
        longitude: taskPoint(task, kind).lng,
        distanceFromPreviousMeters: Math.round(Number(leg.distance ?? 0)),
        distanceFromPreviousKm: Number((Number(leg.distance ?? 0) / 1000).toFixed(2)),
        travelTimeFromPreviousMinutes: Number((Number(leg.duration ?? 0) / 60).toFixed(1)),
        cumulativeDistanceKm: Number((cumulativeDistance / 1000).toFixed(2)),
        cumulativeTravelTimeMinutes: Number((cumulativeDuration / 60).toFixed(1))
      });
      cursor = node;
      sequence += 1;
    }
  }
  return stops;
}

function validate(stops: any[], tasks: any[], batch: any, actualOrder: any[]) {
  const expected = new Set(tasks.flatMap((task) => [`${task.id}:PICKUP`, `${task.id}:DROP`]));
  const returned = stops.map((stop) => stop.stopId);
  const duplicates = returned.filter((stop, index) => returned.indexOf(stop) !== index);
  const missing = [...expected].filter((stop) => !returned.includes(stop));
  const dependencyFailures = tasks.filter((task) => returned.indexOf(`${task.id}:DROP`) < returned.indexOf(`${task.id}:PICKUP`));
  const dbOrder = Array.isArray(batch.optimizedStops) ? batch.optimizedStops.map((stop: any) => stop.taskId) : [];
  const actualTaskIds = actualOrder.map((task) => task.id);
  return {
    expectedStops: expected.size,
    returnedStops: returned.length,
    duplicates,
    missing,
    dependencyFailures: dependencyFailures.map((task) => task.id),
    sequenceContinuous: stops.every((stop, index) => stop.sequence === index + 1),
    batchMembership: tasks.every((task) => task.batchId === batch.batchId),
    dbPersistenceMatches: JSON.stringify(dbOrder) === JSON.stringify(actualTaskIds),
    routePositionsMatch: actualOrder.every((task, index) => Number(task.routePosition) === index + 1)
  };
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value).replace(/\|/g, "/")).join(" | ")} |`)
  ].join("\n");
}

function legExplanations(actualOrder: any[], allTasks: any[], matrix: Matrix) {
  const explanations = [];
  const remaining = new Set(actualOrder.map((task) => task.id));
  let cursor = 0;
  for (const task of actualOrder) {
    const candidates = [...remaining].map((taskId) => allTasks.find((candidate) => candidate.id === taskId)).filter(Boolean);
    const nearest = candidates
      .map((candidate) => ({
        stopId: `${candidate.id}:PICKUP`,
        distanceKm: Number((Number(matrix[cursor]?.[taskNodeIndex(allTasks, candidate, "pickup")]?.distance ?? 0) / 1000).toFixed(2))
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    explanations.push({
      previous: cursor === 0 ? "RIDER-START" : `${actualOrder[actualOrder.indexOf(task) - 1]?.id}:DROP`,
      next: `${task.id}:PICKUP`,
      selectedNearest: nearest[0]?.stopId === `${task.id}:PICKUP`,
      nearest,
      reason: "Selected by the existing Darji batch optimizer job sequence. The diagnostic nearest-feasible list is shown separately and is not treated as the solver reason."
    });
    remaining.delete(task.id);
    cursor = taskNodeIndex(allTasks, task, "drop");
  }
  return explanations;
}

async function writeReports(report: any, stops: any[], outDir: string) {
  await mkdir(outDir, { recursive: true });
  const base = report.runId.toLowerCase();
  const jsonPath = path.join(outDir, `${base}.json`);
  const csvPath = path.join(outDir, `${base}-stops.csv`);
  const mdPath = path.join(outDir, `${base}.md`);

  const stopRows = stops.map((stop) => [
    stop.sequence,
    stop.stopId,
    stop.orderId,
    stop.type,
    stop.entity,
    `${stop.distanceFromPreviousKm} km`,
    `${stop.travelTimeFromPreviousMinutes} min`,
    `${stop.cumulativeDistanceKm} km`,
    `${stop.cumulativeTravelTimeMinutes} min`
  ]);
  const checks = report.validationChecklist.map((item: any) => `[${item.status}] ${item.label}${item.reason ? ` - ${item.reason}` : ""}`).join("\n");
  const md = `# DARJI DELIVERY OPTIMIZATION TEST REPORT

## Executive Summary

Test Run ID: ${report.runId}

Status: ${report.status}

Final verdict: ${report.finalVerdict}

Batch Type: ${report.batch.batchType}

Orders: ${report.orders.length}

Expected Stops: ${report.validation.expectedStops}

Returned Stops: ${report.validation.returnedStops}

OSRM: ${report.osrm.status}${report.osrm.error ? ` (${report.osrm.error})` : ""}

Optimizer: ${report.optimizerStatus}

Delivery App Synchronization: ${report.deliveryAppSynchronization.status}

## Order Creation Report

${markdownTable(["Order ID", "Customer", "Tailor", "Service", "Batch Type", "Pickup Stop", "Drop Stop", "Status"], report.orders.map((order: any) => [order.label, order.customer, order.tailor, "Alteration", report.batch.batchType, order.pickupStop, order.dropStop, "CREATED"]))}

## Batch Report

${markdownTable(["Batch ID", "Batch Type", "Batch Status", "Rider", "Release Time", "Orders", "Stops"], [[report.batch.batchId, report.batch.batchType, report.batch.status, report.batch.rider, report.batch.releaseTime, report.orders.length, report.validation.returnedStops]])}

## Full Optimized Route

${markdownTable(["Sequence", "Stop ID", "Order ID", "Type", "Entity", "Distance From Previous", "Travel Time", "Cumulative Distance", "Cumulative Time"], stopRows)}

## Stop-by-Stop Explanation

${report.explanations.map((item: any, index: number) => `### Transition ${index + 1}

Previous: ${item.previous}

Next: ${item.next}

Nearest feasible alternatives:
${item.nearest.map((candidate: any) => `- ${candidate.stopId} - ${candidate.distanceKm} km`).join("\n")}

Selected nearest feasible stop: ${item.selectedNearest ? "YES" : "NO"}

Why this stop was selected: ${item.reason}

Pickup/drop dependency: PASS
`).join("\n")}

## Route Comparison

${markdownTable(["Route Type", "Total Distance", "Total Travel Time", "Valid?", "Notes"], report.comparisons.map((item: any) => [item.routeType, `${item.totalDistanceKm} km`, `${item.totalTravelTimeMinutes} min`, item.valid ? "YES" : "NO", item.notes]))}

Distance saved vs original: ${report.savings.distanceSavedKm} km

Percentage saved vs original: ${report.savings.percentageSaved == null ? "N/A" : `${report.savings.percentageSaved}%`}

Distance gap vs exact optimum: ${report.savings.distanceGapVsExactKm == null ? "N/A" : `${report.savings.distanceGapVsExactKm} km`}

## Constraint Validation

${checks}

## Performance

${markdownTable(["Metric", "Value"], Object.entries(report.performance).map(([key, value]) => [key, String(value)]))}

## Bugs and Recommendations

${report.bugs.length ? report.bugs.map((bug: any) => `### ${bug.id}

Severity: ${bug.severity}

Description: ${bug.description}

Expected behavior: ${bug.expected}

Actual behavior: ${bug.actual}

File path: ${bug.file}

Function: ${bug.functionName}

Suggested fix: ${bug.suggestedFix}`).join("\n\n") : "No route correctness bugs were found in this run. Delivery app runtime synchronization remains not tested."}
`;

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(csvPath, [
    "sequence,stopId,orderId,type,entity,address,latitude,longitude,distanceFromPreviousKm,travelTimeFromPreviousMinutes,cumulativeDistanceKm,cumulativeTravelTimeMinutes",
    ...stops.map((stop) => [
      stop.sequence,
      stop.stopId,
      stop.orderId,
      stop.type,
      stop.entity,
      stop.address,
      stop.latitude,
      stop.longitude,
      stop.distanceFromPreviousKm,
      stop.travelTimeFromPreviousMinutes,
      stop.cumulativeDistanceKm,
      stop.cumulativeTravelTimeMinutes
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
  ].join("\n"));
  await writeFile(mdPath, md);
  return { mdPath, jsonPath, csvPath };
}

async function main() {
  const started = performance.now();
  const args = parseArgs();
  const runId = testRunId(args.seed, args.simulateOsrmFailure ? "OSRM-FAILURE" : undefined);
  process.env.DARJI_DELIVERY_OPTIMIZATION_TEST = "1";
  if (args.simulateOsrmFailure) process.env.OSRM_URL = "http://127.0.0.1:1";

  const memory = await MongoMemoryServer.create({ instance: { dbName: "delivery-optimization-test" } });
  await mongoose.connect(memory.getUri());

  try {
    const creationStarted = performance.now();
    const fixture = await createFakeData(args, runId);
    const creationMs = Math.round(performance.now() - creationStarted);
    const tasks = await DeliveryRequestModel.find({ batchId: fixture.batchId }).sort({ createdAt: 1 });
    const points = pointsForTasks(tasks);
    const osrmStarted = performance.now();
    const osrm = await rawOsrmMatrixStatus(points, args.simulateOsrmFailure);
    const osrmMs = Math.round(performance.now() - osrmStarted);
    const matrixStarted = performance.now();
    const matrix = await roadDistanceMatrix(points);
    const matrixMs = Math.round(performance.now() - matrixStarted);

    const optimizationStarted = performance.now();
    const optimized = await optimizeDeliveryBatchForTesting(fixture.batchId);
    const optimizationMs = Math.round(performance.now() - optimizationStarted);
    const batch = await DeliveryBatchModel.findOne({ batchId: fixture.batchId });
    const orderedTasks = optimized.orderedTasks;
    const actualStops = buildStops(orderedTasks, tasks, matrix);
    const validation = validate(actualStops, tasks, batch, orderedTasks);

    const originalTotals = routeDistance(tasks, tasks, matrix);
    const actualTotals = routeDistance(orderedTasks, tasks, matrix);
    const nearestOrder = nearestNeighborOrder(tasks, matrix);
    const nearestTotals = routeDistance(nearestOrder, tasks, matrix);
    const exact = exactBestOrder(tasks, matrix);
    const comparisons = [
      { routeType: "Actual Darji optimizer", totalDistanceKm: Number((actualTotals.distance / 1000).toFixed(2)), totalTravelTimeMinutes: Number((actualTotals.duration / 60).toFixed(1)), valid: validation.dependencyFailures.length === 0, notes: optimized.optimizerStatus },
      { routeType: "Original creation order", totalDistanceKm: Number((originalTotals.distance / 1000).toFixed(2)), totalTravelTimeMinutes: Number((originalTotals.duration / 60).toFixed(1)), valid: true, notes: "Diagnostic baseline only" },
      { routeType: "Nearest-neighbor diagnostic", totalDistanceKm: Number((nearestTotals.distance / 1000).toFixed(2)), totalTravelTimeMinutes: Number((nearestTotals.duration / 60).toFixed(1)), valid: true, notes: "Independent diagnostic route, not production optimizer" }
    ];
    if (exact) {
      comparisons.push({ routeType: "Exact best valid job route", totalDistanceKm: Number((exact.distance / 1000).toFixed(2)), totalTravelTimeMinutes: Number((exact.duration / 60).toFixed(1)), valid: true, notes: "Exhaustive job-order search with pickup-before-drop inside each job" });
    }

    const distanceSavedKm = Number(((originalTotals.distance - actualTotals.distance) / 1000).toFixed(2));
    const percentageSaved = originalTotals.distance > 0 ? Number(((distanceSavedKm / (originalTotals.distance / 1000)) * 100).toFixed(1)) : null;
    const distanceGapVsExactKm = exact ? Number(((actualTotals.distance - exact.distance) / 1000).toFixed(2)) : null;
    const deliveryAppSynchronization = {
      status: "NOT TESTED",
      reason: "The Expo delivery app/runtime and authenticated HTTP API were not launched by this runner. Database routePosition persistence was verified instead."
    };
    const routeValid = validation.expectedStops === validation.returnedStops
      && !validation.duplicates.length
      && !validation.missing.length
      && !validation.dependencyFailures.length
      && validation.sequenceContinuous
      && validation.batchMembership
      && validation.dbPersistenceMatches
      && validation.routePositionsMatch;
    const exactPassed = !exact || Math.abs(actualTotals.distance - exact.distance) < 1;
    const fullVerified = routeValid && osrm.status === "PASS" && exactPassed && optimized.usablePoints && deliveryAppSynchronization.status === "PASS";
    const status = fullVerified ? "PASS" : routeValid ? "PARTIAL" : "FAIL";
    const finalVerdict = fullVerified ? "VERIFIED OPTIMIZATION" : routeValid ? "ROUTE WORKS BUT OPTIMIZATION NOT PROVEN" : "OPTIMIZATION INCORRECT";
    const bugs = [];
    if (deliveryAppSynchronization.status === "NOT TESTED") {
      bugs.push({
        id: "BUG-001",
        severity: "MEDIUM",
        description: "Delivery app synchronization is not fully proven by this automated backend-only run.",
        expected: "An authenticated delivery app/API test confirms the exact optimized order shown to the rider.",
        actual: "The runner verified database routePosition and optimizedStops only.",
        file: "apps/delivery-app/App.tsx",
        functionName: "buildBatchList / routePosition sorting",
        suggestedFix: "Add an authenticated API integration test that calls /delivery-requests as the test rider and asserts batch task order by routePosition."
      });
    }
    if (osrm.status !== "PASS") {
      bugs.push({
        id: "BUG-002",
        severity: "HIGH",
        description: "OSRM matrix was unavailable or failed for this run.",
        expected: "Road distance matrix is available and captured.",
        actual: osrm.error ?? "OSRM failed",
        file: "backend/src/services/delivery-pricing.service.ts",
        functionName: "roadDistanceMatrix",
        suggestedFix: "Run with a reachable OSRM_URL or mark the run degraded; do not treat fallback distances as verified road distances."
      });
    }

    const report = {
      runId,
      status,
      finalVerdict,
      args,
      safety: {
        database: mongoose.connection.db?.databaseName,
        testMode: process.env.DARJI_DELIVERY_OPTIMIZATION_TEST === "1",
        productionDataModified: false,
        realNotificationsSent: false,
        paymentsCreated: false
      },
      batch: {
        batchId: batch?.batchId,
        batchType: args.batch,
        status: batch?.status,
        rider: "Test Rider 001",
        releaseTime: batch?.routeOptimizedAt?.toISOString?.() ?? null,
        optimizationTotalDistanceMeters: batch?.optimizationTotalDistanceMeters,
        payableOptimizedDistanceMeters: batch?.payableOptimizedDistanceMeters,
        estimatedDurationSeconds: batch?.estimatedDurationSeconds
      },
      orders: fixture.orders,
      optimizerStatus: optimized.optimizerStatus,
      osrm,
      validation,
      validationChecklist: [
        { label: "All expected stops included", status: validation.expectedStops === validation.returnedStops && !validation.missing.length ? "PASS" : "FAIL" },
        { label: "No duplicate stops", status: validation.duplicates.length ? "FAIL" : "PASS", reason: validation.duplicates.join(", ") },
        { label: "No missing stops", status: validation.missing.length ? "FAIL" : "PASS", reason: validation.missing.join(", ") },
        { label: "Pickup-before-drop", status: validation.dependencyFailures.length ? "FAIL" : "PASS", reason: validation.dependencyFailures.join(", ") },
        { label: "Valid sequence numbers", status: validation.sequenceContinuous ? "PASS" : "FAIL" },
        { label: "All stops belong to batch", status: validation.batchMembership ? "PASS" : "FAIL" },
        { label: "Correct rider assigned", status: batch?.deliveryPartnerId === fixture.rider.id ? "PASS" : "FAIL" },
        { label: "Database route matches optimizer output", status: validation.dbPersistenceMatches && validation.routePositionsMatch ? "PASS" : "FAIL" },
        { label: "Delivery app route matches backend", status: "NOT TESTED", reason: deliveryAppSynchronization.reason },
        { label: "OSRM distance matrix available", status: osrm.status },
        { label: "Optimizer executed", status: optimized.usablePoints ? "PASS" : "FAIL" }
      ],
      comparisons,
      savings: { distanceSavedKm, percentageSaved, distanceGapVsExactKm },
      explanations: legExplanations(orderedTasks, tasks, matrix),
      deliveryAppSynchronization,
      bugs,
      performance: {
        dataCreationMs: creationMs,
        osrmProbeMs: osrmMs,
        matrixCalculationMs: matrixMs,
        optimizationMs,
        totalMs: Math.round(performance.now() - started),
        stops: actualStops.length,
        distanceCalculations: points.length * points.length
      },
      route: actualStops
    };

    const paths = await writeReports(report, actualStops, path.resolve(process.cwd(), "..", "reports", "delivery-optimization"));
    console.log(JSON.stringify({
      runId,
      status,
      finalVerdict,
      command: `npm run test:delivery-optimization -- --stops=${args.stops} --seed=${args.seed}${args.simulateOsrmFailure ? " --simulate-osrm-failure" : ""}`,
      reports: paths,
      optimizedRoute: actualStops.map((stop) => ({ sequence: stop.sequence, stopId: stop.stopId, distanceFromPreviousKm: stop.distanceFromPreviousKm })),
      comparisons
    }, null, 2));
  } finally {
    await mongoose.disconnect();
    await memory.stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
