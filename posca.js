const posca_triangle = (number) => {
    let res=[];
    let currentPoica=[];
    for(let i=0;i<number;i++){
        let prevPoica=[];
        if(i===0){
            res.push([1]);
            continue;
        }
        prevPoica=res[res.length-1];
        currentPoica=[1];
        for(let j=1;j<prevPoica.length;j++){
            currentPoica.push(prevPoica[j-1]+prevPoica[j]);
        }
        currentPoica.push(1);
        res.push(currentPoica);
    }
    return res;
};
console.log(posca_triangle(5))