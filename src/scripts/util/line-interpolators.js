//a place to define custom line interpolators

const d3 = require('d3');

function gappedLineInterpolator(points) {  //interpolate straight lines with gaps for NaN


    let section = 0;
    const arrays = [[]];
    points.forEach(function (d) {
        if (isNaN(d[1])) {
            if (arrays[section].length === 1) {
                console.log('warning: Found a line fragment which is a single point this won\'t be drawn');
            }
            section++;
            arrays[section] = [];
        } else {
            arrays[section].push(d);
        }
    });

    const pathSections = [];
    arrays.forEach(function (points) {
        pathSections.push(d3.svg.line()(points));
    });
    const joined = pathSections.join('');
    return joined.substr(1); //substring becasue D£ always adds an M to a path so we end up with MM at the start
}

module.exports = {
    gappedLine: gappedLineInterpolator
};
