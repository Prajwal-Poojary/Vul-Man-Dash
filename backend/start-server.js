const { exec } = require('child_process');
console.log('Starting Flask backend...');
exec('python run.py', { cwd: 'backend' }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backend error: ${error}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);
});