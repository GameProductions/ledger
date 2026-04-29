import pexpect
import sys

def run_generate():
    print("Starting drizzle-kit generate...")
    child = pexpect.spawn('npx drizzle-kit generate', cwd='/Users/morenicano/Documents/coding/projects/bots/ledger')
    child.logfile = sys.stdout.buffer
    
    while True:
        try:
            # Expect any question ending with '?'
            index = child.expect([r'\?', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
            
            if index == 0:
                # Question found. We want to select the rename option if it exists.
                # Usually option 1 is 'create table', option 2 is 'rename table' (if it matches).
                # But since we have many renames, it might be safer to just 'create' if we don't care about data.
                # However, the user might want renames.
                # For now, let's just 'create' (Option 1) to get the migration file generated.
                # Or try to find 'rename' in the output.
                
                output = child.before.decode('utf-8')
                if 'rename table' in output or 'rename column' in output:
                    print("\n[Script] Detected rename option, selecting it...")
                    child.sendline('\x1b[B') # Down arrow
                    child.sendline('\n') # Enter
                else:
                    print("\n[Script] No rename option detected or ambiguous, creating new...")
                    child.sendline('\n') # Enter
            elif index == 1:
                print("\n[Script] Generation finished.")
                break
            elif index == 2:
                print("\n[Script] Timeout reached.")
                break
        except Exception as e:
            print(f"\n[Script] Error: {e}")
            break

if __name__ == "__main__":
    run_generate()
