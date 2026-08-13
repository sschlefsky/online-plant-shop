const { spawnSync } = require('child_process');

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}\n`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    console.error(`\nCommand failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

// 1. Start MySQL Docker container
run('docker', ['compose', 'up', '-d']);

// 2. Build Angular application
run('npm', ['run', 'build']);

// 3. Start SSR server
run('npm', ['run', 'serve:ssr:project']);
