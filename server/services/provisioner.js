const db = require("../lib/db");
const { getProvider } = require("../providers");
const config = require("../config");

const provider = getProvider();

let workerTimer = null;
let workerBusy = false;

async function processProvisionJob() {
  if (workerBusy) return;

  const job = await db.getQueuedJob("provision_instance");
  if (!job) return;

  workerBusy = true;

  try {
    await db.markJobRunning(job.id);
    const instanceId = job.payload.instanceId;

    const instances = await db.listInstances();
    const instance = instances.find((item) => item.id === instanceId);
    if (!instance) throw new Error(`instance not found: ${instanceId}`);

    const provisioned = await provider.provisionInstance(instance);

    await db.updateInstance(instance.id, {
      status: provisioned.status,
      providerRef: provisioned.providerRef,
      endpoint: provisioned.endpoint,
    });

    await db.addEvent({
      type: "instance.provisioned",
      message: `Instance ${instance.id} is running`,
      payload: { instanceId: instance.id, endpoint: provisioned.endpoint },
    });

    await db.markJobDone(job.id);
  } catch (err) {
    await db.markJobFailed(job.id, err.message || String(err));
  } finally {
    workerBusy = false;
  }
}

function startWorker() {
  if (workerTimer) return;
  workerTimer = setInterval(processProvisionJob, config.runtime.workerIntervalMs);
  processProvisionJob().catch((err) => {
    console.error("[provisioner] boot run failed", err);
  });
}

function stopWorker() {
  if (!workerTimer) return;
  clearInterval(workerTimer);
  workerTimer = null;
}

module.exports = {
  startWorker,
  stopWorker,
};
