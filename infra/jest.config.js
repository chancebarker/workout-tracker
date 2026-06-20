/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    // Compile the (NodeNext/ESM) source to CommonJS for Jest. aws-cdk-lib works under both.
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          resolveJsonModule: true,
          skipLibCheck: true,
        },
      },
    ],
  },
}
