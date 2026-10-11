// pkgroll replaces these with the commit and package version at build time (see "dist:build" in package.json).
// Running from source, they are read from the environment and usually unset.
export const VERSION = `${process.env.STOETZMS_WORK_COMMIT ?? 'LOCAL'} (${process.env.STOETZMS_WORK_VERSION ?? 'LOCAL'})`
