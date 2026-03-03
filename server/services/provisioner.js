const db = require("../lib/db");
const provider = require("../providers/mockProvider");
const config = require("../config");

let workerTimer = null;
let workerBusy = false;

async function processProvisionJob() {
  if (workerBusy) return;

  const job = db.getQueuedJob("provision_instance");
  if (!job) return;

  workerBusy = true;

  try {
    db.markJobRunning(job.id);
    const instanceId = job.payload.instanceId;

    const instances = db.listInstances();
    const instance = instances.find((i) => i.id === instanceId);
    if (!instance) throw new Error(`instance not found: ${instanceId}`);

    const provisioned = await provider.provisionInstance(instance);

    db.updateInstance(instance.id, {
      status: provisioned.status,
      providerRef: provisioned.providerRef,
      endpoint: provisioned.endpoint,
    });

    db.addEvent({
      type: "instance.provisioned",
      message: `Instance ${instance.id} is running`,
      payload: { instanceId: instance.id, endpoint: provisioned.endpoint },
    });

    db.markJobDone(job.id);
  } catch (err) {
    db.markJobFailed(job.id, err.message || String(err));
  } finally {
    workerBusy = false;
  }
}

function startWorker() {
  if (workerTimer) return;
  workerTimer = setInterval(processProvisionJob, config.runtime.workerIntervalMs);
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
