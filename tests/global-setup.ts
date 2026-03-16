import { clerkSetup } from '@clerk/testing/playwright';

const setup = async () => {
  await clerkSetup();
};

export default setup;
