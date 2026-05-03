import pexpect
import sys

child = pexpect.spawn('npx drizzle-kit generate --name v6_3_notification_engine')
child.logfile = sys.stdout.buffer

while True:
    try:
        index = child.expect(['Is .* table created or renamed', 'Is .* column .* created or renamed', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        if index == 0 or index == 1:
            child.sendline('') # Send Enter to select "create"
        else:
            break
    except pexpect.exceptions.EOF:
        break
    except pexpect.exceptions.TIMEOUT:
        print("\nTimeout reached, but continuing...")
        break

child.close()
