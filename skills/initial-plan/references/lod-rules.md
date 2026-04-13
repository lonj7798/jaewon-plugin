# LOD Hard Rules and Design Patterns

All plans must enforce these rules and detect applicable design patterns.

## Hard Rules (7)

1. **Single Responsibility** -- one reason to change per module
2. **Dependency Inversion** -- depend on abstractions, not concretions
3. **Interface Segregation** -- no forced dependencies on unused methods
4. **Acyclic Dependencies** -- module graph must be a DAG
5. **Stable Abstractions** -- abstractness increases with stability
6. **Common Closure** -- classes that change together belong together
7. **Common Reuse** -- classes used together belong together

## Design Patterns (9)

Detect and apply where relevant during Phase 0 architecture:

| Pattern | Trigger (apply when...) | Skip (do not apply when...) |
|---------|------------------------|----------------------------|
| **Facade** | Multiple subsystems need a unified interface | Only one subsystem exists |
| **Adapter** | Integrating external APIs or legacy interfaces | Internal interfaces are already compatible |
| **Strategy** | Multiple interchangeable algorithms at runtime | Only one algorithm variant exists |
| **Observer** | Components need loose-coupled event notification | Direct method calls suffice |
| **Repository** | Data access needs abstraction from storage | Simple in-memory data only |
| **Factory** | Object creation logic is complex or conditional | Simple `new` constructor suffices |
| **Mediator** | Many-to-many component communication | Components interact in pairs only |
| **Decorator** | Behavior needs to be added dynamically | Static composition works |
| **Command** | Operations need undo, queue, or logging | Simple synchronous calls suffice |

## Enforcement

During planning:
- Phase 0 must include system decomposition per Hard Rules
- Each module boundary must justify which Hard Rules it satisfies
- Design patterns are detected from requirements, not forced
- Module dependency graph must be verified as a DAG (Rule 4)
