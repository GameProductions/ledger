# Fleet-wide Refactoring & Engineering Standards

- **Opportunistic Abstract Refactoring**: Whenever logic or code is being added or modified, if it can be abstractly refactored to increase code quality, DRY principles, and modularity without introducing sacrifices in performance, readability, or complexity, always opt for abstract refactoring.
- **No Forced Abstractions**: Never force abstract refactoring. If abstraction does not make logical sense, introduces unnecessary layers, complicates debugging, or risks stability in a specific code block, keep the implementation concrete.
- **Engineering Principles**: Always prioritize methods of coding that are highly efficient, secure, stable, and follow best-practices.
