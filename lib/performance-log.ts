export const measureApi = async <T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();

  try {
    return await fn();
  } finally {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[perf] ${label}: ${Date.now() - start}ms`);
    }
  }
};

export const measureStep = measureApi;
