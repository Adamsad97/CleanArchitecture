export const Result = {
    ok(value) {
        return { ok: true, value };
    },
    err(error) {
        return { ok: false, error };
    },
};
