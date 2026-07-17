import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type DarjiIdPrefix =
  | "ADM"
  | "ADR"
  | "BUG"
  | "CPN"
  | "CRQ"
  | "CUS"
  | "DBT"
  | "DDP"
  | "DPP"
  | "DRQ"
  | "INV"
  | "NTF"
  | "ORD"
  | "PAY"
  | "RFD"
  | "RVW"
  | "SGC"
  | "SRV"
  | "TKT"
  | "TLR"
  | "TRQ"
  | "QUO"
  | "TXN"
  | "WLT"
  | "WTX";

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

type CounterDoc = HydratedDocument<{ _id: string; seq: number }>;

const CounterModel: Model<{ _id: string; seq: number }> =
  mongoose.models.DarjiCounter ?? mongoose.model("DarjiCounter", counterSchema);

const DEFAULT_DIGITS = 6;

function formatDarjiId(prefix: DarjiIdPrefix, sequence: number) {
  return `DAR-${prefix}-${String(sequence).padStart(DEFAULT_DIGITS, "0")}`;
}

export async function nextDarjiId(prefix: DarjiIdPrefix) {
  const counter = (await CounterModel.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )) as CounterDoc | null;

  if (!counter) {
    throw new Error(`Failed to allocate Darji ID for prefix ${prefix}`);
  }

  return formatDarjiId(prefix, counter.seq);
}

type DarjiIdPluginOptions = {
  field: string;
  prefix: DarjiIdPrefix | ((doc: Record<string, unknown> & { role?: string }) => DarjiIdPrefix | undefined);
  roleField?: string;
};

function resolvePrefix(
  prefix: DarjiIdPluginOptions["prefix"],
  source: Record<string, unknown> & { role?: string }
) {
  return typeof prefix === "function" ? prefix(source) : prefix;
}

async function assignIdIfMissing(
  target: Record<string, unknown> & { isNew?: boolean },
  field: string,
  prefix: DarjiIdPluginOptions["prefix"]
) {
  if (target[field]) return;
  const resolvedPrefix = resolvePrefix(prefix, target);
  if (!resolvedPrefix) return;
  target[field] = await nextDarjiId(resolvedPrefix);
}

export function attachDarjiIdPlugin(schema: Schema, options: DarjiIdPluginOptions) {
  const { field, prefix } = options;
  schema.add({
    [field]: { type: String, unique: true, sparse: true, index: true }
  });

  schema.pre("save", async function (this: Record<string, unknown> & { isNew?: boolean }) {
    await assignIdIfMissing(this, field, prefix);
  });

  const updateHooks = ["findOneAndUpdate", "updateOne"] as const;
  for (const hook of updateHooks) {
    schema.pre(hook, async function (this: { getUpdate: () => Record<string, any>; getOptions: () => { upsert?: boolean }; setUpdate: (value: Record<string, any>) => void }) {
      if (!this.getOptions().upsert) return;
      const update = this.getUpdate() ?? {};
      const setOnInsert = (update.$setOnInsert ??= {});
      if (setOnInsert[field]) return;

      const source = {
        ...(update.$set ?? {}),
        ...setOnInsert,
        ...(update ?? {})
      } as Record<string, unknown> & { role?: string };
      const resolvedPrefix = resolvePrefix(prefix, source);
      if (!resolvedPrefix) return;

      setOnInsert[field] = await nextDarjiId(resolvedPrefix);
      this.setUpdate(update);
    });
  }
}



