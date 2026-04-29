const { spawn } = require('child_process');

async function run() {
  const child = spawn('npx', ['drizzle-kit', 'generate'], {
    cwd: '/Users/morenicano/Documents/coding/projects/bots/ledger',
    stdio: ['pipe', 'pipe', 'inherit']
  });

  child.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    if (output.includes('?')) {
      // If it's a rename question, we try to select the first rename option (usually the 2nd option)
      if (output.includes('rename table') || output.includes('rename column')) {
        console.log('\n[Script] Selecting rename option...');
        // Send Down Arrow (\u001b[B) and Enter
        child.stdin.write('\u001b[B');
        child.stdin.write('\n');
      } else {
        console.log('\n[Script] Selecting create option...');
        child.stdin.write('\n');
      }
    }
  });

  child.on('close', (code) => {
    console.log(`[Script] Child process exited with code ${code}`);
  });
}

run();
