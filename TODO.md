# TODO

- Add support for an existing DSL patch/edit tool instead of only recreating the full DSL.
  The current recreate-only approach is inconsistent for small changes and increases the risk of unintended modifications.
  Introduce a way to adjust the existing DSL incrementally without regenerating the whole document, using techniques similar to patch-based editing flows used by Cursor AI and other LLM-enabled code editors.
