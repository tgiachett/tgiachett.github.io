let c = document.getElementById("canvas");
let ctx = c.getContext('2d');
let img = new Image();
img.onload = init; img.crossOrigin = "";
img.src = './Assets/Images/Profile_Pic_2.png';
let cycleIndex = -1;
let cycleArr = [medianCutPalette, brightnessSteps, dither];
let brightest = 0;
let darkest = 255;
let outPal;
const email = document.getElementById('mailReveal');
const address = document.getElementById('mail');

//reveal email
email.addEventListener("click", function(event) {
    event.preventDefault();
    email.innerHTML = "tgiachett@gmail.com";
    email.style.cursor = 'default';
});

function init() {
    setup(this);
}

function setup(img) {
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);;
}

function cycle (callback, args) {
    callback(...args);
}

c.addEventListener("click", function(event) {
    event.preventDefault();
    setup(img);
    if(cycleIndex === cycleArr.length-1) {
	cycleIndex = -1;
	return;
    }
    cycleIndex++;
    if(cycleArr[cycleIndex] === brightnessSteps) {
	cycle(cycleArr[cycleIndex],[16, getRange]);
    } else if (cycleArr[cycleIndex] === medianCutPalette) {
	cycle(cycleArr[cycleIndex],[16]);
    } else {
    cycle(cycleArr[cycleIndex],"");
    }
});


//dither
function dither (number) {
    let idataSrc = ctx.getImageData(0,0, c.width, c.height),
	idataTrg = ctx.createImageData(c.width, c.height),
	dataSrc = idataSrc.data,
	dataTrg = idataTrg.data,
	len = dataSrc.length,luma;
    // convert to grayscale
    for (let i = 0;i < len; i += 4) {
	luma = dataSrc[i] * 0.2126 + dataSrc[i+1] * .7152 + dataSrc[i+2] * .0722;
	dataTrg[i] = dataTrg[i+1] = dataTrg[i+2] = luma;
	dataTrg[i+3] = dataSrc[i+3];
    }
    

    for (let i = 0; i < len; i += 4) {
	if(dataTrg[i+(c.width * 4)] === -1 || dataTrg[i+4] === -1 ) {
	    break;
	    ;} else {
		let oldPixel = dataTrg[i];
		
		let newPixel = findClosestPalCol(dataTrg[i]);
		
		dataTrg[i] = dataTrg[i+1] = dataTrg[i+2] = newPixel;
		let quantError = oldPixel - newPixel;
		dataTrg[i+4] = dataTrg[i+4] + quantError * (7 / 16);
		dataTrg[i+(c.width * 4)] = dataTrg[i+(c.width * 4)] + quantError * (5 / 16);
		dataTrg[i+(c.width* 4 -4)] = dataTrg[i+(c.width*4 -4)] + quantError * (3 / 16);
		dataTrg[i+(c.width* 4 +4)] = dataTrg[i+(c.width * 4 +4)] + quantError * (1 / 16);
	    }

    }

    ctx.putImageData(idataTrg, 0, 0);

};

function findClosestPalCol (srcPx) {
    if(256-srcPx < 256/2) {
	return 255;
    } else {
	return 0;
    }
    
} 


//brightness steps
function brightnessSteps (number, getRangeCallback) {
    // set up initial image source and target container
    let idataSrc = ctx.getImageData(0,0, c.width, c.height),
	idataTrg = ctx.createImageData(c.width, c.height);
    // make a greyscale matrix of all image color values
    let greyScale = getLuma(idataSrc, idataTrg, getRangeCallback);
    // get the step value from the number
    let step = getStep(brightest, darkest, number);
    //create steps from the greyscale
    let stepified = stepify(greyScale, greyScale, step);
  // write the stepified image matrix into the canvas
    ctx.putImageData(stepified, 0, 0);
 
};
//adapted from https://stackoverflow.com/questions/37159358/save-canvas-in-grayscale
//gets sets greyscale according to BT.601
function getLuma(src, trg, getRangeCallback) {
    let dataSrc = src.data,
	dataTrg = trg.data,
	len = dataSrc.length,luma;
    for (let i = 0;i < len; i += 4) {
	luma = dataSrc[i] * 0.2126 + dataSrc[i+1] * .7152 + dataSrc[i+2] * .0722;

	// helper function for getting brightest and darkest luma (and only if called)
	typeof getRangeCallback === 'function' && getRangeCallback(luma);

	//sets all color channels to luma value
	dataTrg[i] = dataTrg[i+1] = dataTrg[i+2] = luma;
	//preserve alpha channel
	dataTrg[i+3] = dataSrc[i+3];
    }
    return trg;
}

function getStep (high, low, number) {
    let range = high - low;
    let step = range / number;
    return step;
}

function stepify (src, trg, step) {
    //only works when src is greyscale
    let dataSrc = src.data;
    let dataTrg = trg.data;
    let len = dataSrc.length;
    for (let i = 0; i < len; i += 4) {
	let luma = dataSrc[i];
	for(let k = step; k <= brightest; k += step) {
	    if(luma < k) {
		dataTrg[i] = dataTrg[i+1] = dataTrg[i+2] = k;
		break;
	    }
	}
    }
    return trg;
}

function getRange(luma) {
    	if(luma > brightest) {
	    brightest = luma;
	}
	if(luma < darkest) {
	    darkest = luma;
	}
}

//color quant
// main driver
function medianCutPalette (num) {

    // set up initial image source and target container
    let idataSrc = ctx.getImageData(0,0, c.width, c.height),
	idataTrg = ctx.createImageData(c.width, c.height);
    
    let pal = getPal(idataSrc, num);
    compressColors(pal, idataSrc, idataTrg);
    return pal;
};


//get the palette values
function getPal(src, num) {
    
    let dataSrc = src.data,
	len = dataSrc.length;
    let pixelSet = [];

    for (let i = 0;i < len; i += 4) {
	let groupedPixelData = [dataSrc[i], dataSrc[i+1], dataSrc[i+2]];
	pixelSet.push(groupedPixelData);
    }

    // super inefficient way of getting rid of unique colors?
    let uniqueColorSet = [...new Set(pixelSet.map(color => color.toString()))];
    let uniqueColorsArr = uniqueColorSet.map(color => color.split(','));
    //get the initial max range color for the whole "bucket"
    let maxRangeInitial = getMaxRangeColorIndex(uniqueColorsArr);
    uniqueColorsArr.sort(function(a, b) {return +a[maxRangeInitial] - +b[maxRangeInitial];});
    
    let bucketsArr = [];
    // use cut to seperate into buckets and get max range color for each bucket, sort by that
    cut(uniqueColorsArr, bucketsArr, uniqueColorsArr, num);
    // get the color averages for each bucket
    let palette = getColorAverages(bucketsArr);
    
    return palette;
}

//palette display setup
function createPal (palletteCanvas, palette, ctxPal) {
    //arrange by sums
    palette.sort(function(a,b) {return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
    let xPlace = 0;
    let yPlace = 0;
    let row = Math.ceil(Math.sqrt(palette.length));
    palletteCanvas.height = (palette.length/row * 30) + 30;
    palletteCanvas.width  = (palette.length/row * 30) + 30;

    for(let i = 0; i < palette.length; i++) {
	if(i%row === 0 && i != 0) {
	    yPlace += 30;
	    xPlace = 0;
	}
	ctxPal.fillStyle = `rgb(${palette[i][0]}, ${palette[i][1]}, ${palette[i][2]})`;
	ctxPal.fillRect(xPlace, yPlace, 30, 30 );
	xPlace += 30;
    }
    
}




function compressColors (pal,src, trg) {
    let dataSrc = src.data;
    let dataTrg = trg.data;
    let len = dataSrc.length;
    for (let i = 0; i < len; i += 4) {
	let shortest = 255;
	let shortestIndex;
	for(let j = 0; j < pal.length; j++) {
	    let dist = getDistance(pal[j], [dataSrc[i], dataSrc[i+1], dataSrc[i+2]]);
	    if (dist < shortest) {
		shortest = dist;
		shortestIndex = j;
	    }
	}
	dataTrg[i] = pal[shortestIndex][0];
	dataTrg[i+1] = pal[shortestIndex][1];
	dataTrg[i+2] = pal[shortestIndex][2];
	dataTrg[i+3] = 255;
	
    }

    ctx.putImageData(trg, 0, 0);
    return trg;
}


function getDistance(a, b) {
    let dist = Math.sqrt(Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2) + Math.pow(a[2]-b[2], 2));
    return dist;
}


function getColorAverages (bucketsArr) {
    let palette = [];
    bucketsArr.forEach(bucket => {
	let red = 0, green = 0, blue = 0;
	
	bucket.forEach(color => {
	    red += +color[0];
	    green += +color[1];
	    blue += +color[2];
	});
	let avgR = Math.floor(red/bucket.length);
	let avgG = Math.floor(green/bucket.length);
	let avgB = Math.floor(blue/bucket.length);

	let avg = [avgR, avgG, avgB];
	palette.push(avg);
    });
    return palette;
}

// make color buckets
function cut (arr, bucketsArr, master, buckets){
    if(buckets === 1) {
	bucketsArr.push(arr);
	return;
    } else {
	buckets /= 2;
	// get max range for each bucket and sort by that
	let maxRange = getMaxRangeColorIndex(arr);
	arr.sort(function(a, b) {return +a[maxRange] - +b[maxRange];});
	let middle = Math.floor(arr.length/2);
	let firstHalf = arr.slice(0, middle-1);
	let secondHalf = arr.slice(middle);
	cut(firstHalf, bucketsArr, master, buckets);
	cut(secondHalf, bucketsArr, master, buckets);
    }
}
// takes processed color groups instead of canvas data array
function getMaxRangeColorIndex (src) {
    
    let len = src.length;
    let rMin = 255;
    let rMax = 0;
    let gMin = 255;
    let gMax = 0;
    let bMin = 255;
    let bMax = 0;
    for (let i = 0; i < len; i ++) {
	let red = +src[i][0];
	let green = +src[i][1];
	let blue = +src[i][2];

	if(red < rMin) {
	    rMin = red;
	}
	if(red > rMax) {
	    rMax = red;
	}
	if(green < gMin) {
	    gMin = green;
	}
	if(green > gMax) {
	    gMax = green;
	}
	if(blue < bMin) {
	    bMin = blue;
	}
	if(blue > bMax) {
	    bMax = blue;
	}
    }
    let rRange = rMax - rMin;
    let gRange = gMax - gMin;
    let bRange = bMax - bMin;

    let set = [[rRange, 0], [gRange, 1], [bRange, 2]];
    set.sort(function(a, b){return a[0] - b[0];});
    return set[set.length-1][1];
}

function powerOfTwo(x) {
    return (Math.log(x)/Math.log(2)) % 1 === 0;
}
