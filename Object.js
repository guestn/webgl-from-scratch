export default class Object {
    constructor(obj) {
        this.obj = obj;
    }

    rotate = (axis, r) => {
        const quat = glMatrix.quat.create();
        const normAxis = glMatrix.vec3.create();
        glMatrix.vec3.normalize(normAxis, glMatrix.vec3.fromValues(axis[0], axis[1], axis[2]))
        
        glMatrix.quat.setAxisAngle(quat, normAxis, r);

        const rObj = new Array(this.obj.position.length / 3).fill({}).reduce(
            (agg, curr, idx) => {
                const p = glMatrix.vec3.fromValues(
                    this.obj.position[idx * 3],
                    this.obj.position[idx * 3 + 1],
                    this.obj.position[idx * 3 + 2],
                );
                const rp = glMatrix.vec3.create();
                glMatrix.vec3.transformQuat(rp, p, quat);

                const n = glMatrix.vec3.fromValues(
                    this.obj.normal[idx * 3],
                    this.obj.normal[idx * 3 + 1],
                    this.obj.normal[idx * 3 + 2],
                );
                const rn = glMatrix.vec3.create();
                glMatrix.vec3.transformQuat(rn, n, quat);

                return {
                    position: agg.position.concat(...rp),
                    normal: agg.normal.concat(...rn),
                    uv: this.obj.uv,
                    index: this.obj.index,
                };
            },
            { position: [], normal: [], uv: [], index: [] },
        );
        this.obj = rObj;
    };

    translate = (v) => {
        this.obj = {
            ...this.obj,
            position: this.obj.position.map((p, idx) => (p += v[idx % 3])),
        };
    };

    scale(v) {        
        this.obj = {
            ...this.obj,
            position: this.obj.position.map((p, idx) => (p *= v[idx % 3])),
        };
    };
}
